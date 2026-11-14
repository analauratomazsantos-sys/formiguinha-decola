"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express"), session = require("express-session");
const jpeg = require("../api/vendor/jpeg-js");
const { criarServicoFotos } = require("../api/services/fotoAlunoService");
const { assinarIdentificacao, verificarIdentificacao } = require("../api/services/mercadinhoService");
const { assinarEdicaoFoto, verificarEdicaoFoto } = require("../api/services/fotoAlunoIdentificacao");
const { criarController } = require("../api/controllers/mercadinhoController");
const { criarRotasFotos } = require("../api/routes/fotoAlunoRoutes");
const { criarRotasGestaoFotos } = require("../api/routes/gestaoFotosRouter");
const { criarBancoFalso } = require("./mercadinho.fake-db");

function imagem(largura = 20, altura = 30) {
    const data = Buffer.alloc(largura * altura * 4, 180);
    return jpeg.encode({ data, width: largura, height: altura, comments: ["metadado-sintetico-a-remover"] }, 80).data;
}

test("foto é validada, limpa e vinculada ao id_aluno sem alterar saldos ou QR", async () => {
    const db = criarBancoFalso(), fotos = criarServicoFotos(db), segredo = "segredo-sintetico";
    const token = assinarEdicaoFoto(2, 5, segredo);
    const original = db.state.contas.get(20).qr;
    await fotos.salvar(imagem(), token, 5, segredo);
    const cadastrada = await fotos.consultar(2);
    assert.equal(cadastrada.largura, 20); assert.equal(cadastrada.altura, 30);
    assert.equal(cadastrada.imagem.includes(Buffer.from("metadado-sintetico")), false);
    assert.equal(db.state.contas.get(20).saldo, "7.00"); assert.equal(db.state.contas.get(20).qr, original);
    assert.equal(db.state.movimentos.length, 0);
    await fotos.salvar(imagem(22, 25), token, 5, segredo);
    assert.equal(db.state.fotos.size, 1); assert.equal((await fotos.consultar(2)).largura, 22);
});

test("foto recusa token de outro operador, conteúdo falso e resolução excessiva", async () => {
    const db = criarBancoFalso(), fotos = criarServicoFotos(db), segredo = "segredo-sintetico";
    const token = assinarEdicaoFoto(1, 5, segredo);
    await assert.rejects(fotos.salvar(imagem(), token, 6, segredo), { status: 409 });
    await assert.rejects(fotos.salvar(Buffer.from("<svg onload='alert(1)'></svg>"), token, 5, segredo), { status: 400 });
    await assert.rejects(fotos.salvar(Buffer.from([255, 216, 255, 0, 0, 0]), token, 5, segredo), { status: 400 });
    await assert.rejects(fotos.salvar(imagem(500, 500), token, 5, segredo), { status: 400 });
    assert.equal(db.state.fotos.size, 0); assert.equal(db.state.movimentos.length, 0);
});

test("estudante inexistente ou tabela de fotos ausente não deixa registros parciais", async () => {
    const db = criarBancoFalso(), fotos = criarServicoFotos(db), segredo = "segredo-sintetico";
    const token = assinarEdicaoFoto(1, 5, segredo);
    await assert.rejects(fotos.salvar(imagem(), assinarEdicaoFoto(999, 5, segredo), 5, segredo), { status: 404 });
    db.state.semTabelaFotos = true;
    await assert.rejects(fotos.salvar(imagem(), token, 5, segredo), { status: 503 });
    assert.equal(db.state.fotos.size, 0); assert.equal(db.state.movimentos.length, 0);
    assert.equal(db.state.contas.get(10).saldo, "20.00");
});

test("edição de foto tem identificação própria e recusa troca de aluno, finalidade e sessão", () => {
    const agora = 1000000, segredo = "segredo-foto-sintetico", token = assinarEdicaoFoto(2, 5, segredo, agora);
    assert.equal(verificarEdicaoFoto(token, 5, segredo, agora), 2);
    const partes = token.split("."), dados = JSON.parse(Buffer.from(partes[0], "base64url").toString());
    dados.aluno = 1;
    assert.throws(() => verificarEdicaoFoto(Buffer.from(JSON.stringify(dados)).toString("base64url") + "." + partes[1], 5, segredo, agora), { status: 409 });
    assert.throws(() => verificarEdicaoFoto(token, 6, segredo, agora), { status: 409 });
    assert.throws(() => verificarEdicaoFoto(token, 5, "outra-sessao", agora), { status: 409 });
    assert.throws(() => verificarEdicaoFoto(token, 5, segredo, agora + 1800000), { status: 409 });
    assert.throws(() => verificarEdicaoFoto(assinarIdentificacao({ id_aluno: 2, id_conta: 20 }, 5, segredo, agora), 5, segredo, agora), { status: 409 });
    assert.throws(() => verificarIdentificacao(token, 5, segredo, agora), { status: 409 });
});

test("administrador cadastra foto por id_aluno mesmo sem RA ou conta, sem criar conta", async () => {
    const db = criarBancoFalso(), fotos = criarServicoFotos(db), segredo = "segredo-foto-sintetico";
    db.state.alunosSemConta.push({ id_aluno: 3, nome: "Estudante fictício sem conta", turma: null });
    await fotos.salvar(imagem(), assinarEdicaoFoto(3, 5, segredo), 5, segredo);
    assert.equal((await fotos.consultar(3)).largura, 20);
    assert.equal(db.state.contas.size, 2); assert.equal(db.state.movimentos.length, 0);
});

test("HTTP de fotos exige administrador, CSRF e imagem válida, e limita o envio", async () => {
    const db = criarBancoFalso(), app = express(), c = criarController(db);
    app.use(express.json()); app.use(session({ secret: "apenas-teste-local", resave: false, saveUninitialized: false }));
    app.set("view engine", "ejs"); app.set("views", path.join(__dirname, "..", "api", "views"));
    app.post("/teste/login", (req, res) => { req.session[req.body.aluno ? "aluno" : "usuario"] = { id: 5, nome: "Operador teste" }; res.end(); });
    app.get("/mercadinho", c.exigirAdmin, c.exibir);
    app.post("/mercadinho/api/aluno", c.exigirAdmin, c.exigirCsrf, c.buscar);
    app.use("/mercadinho/api/fotos", criarRotasFotos(db, c));
    app.use("/fotos-estudantes", criarRotasGestaoFotos(db));
    const server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        assert.equal((await fetch(base + "/mercadinho/api/fotos/1")).status, 401);
        const entrar = async body => (await fetch(base + "/teste/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).headers.get("set-cookie").split(";")[0];
        const alunoCookie = await entrar({ aluno: true });
        assert.equal((await fetch(base + "/mercadinho/api/fotos/1", { headers: { Cookie: alunoCookie } })).status, 401);
        for (const rota of ["/fotos-estudantes/2", "/fotos-estudantes/api/fotos/2"]) {
            assert.equal((await fetch(base + rota, { headers: { Cookie: alunoCookie } })).status, 401);
        }
        assert.equal((await fetch(base + "/fotos-estudantes/api/fotos", { method: "POST", headers: { Cookie: alunoCookie } })).status, 401);
        const cookie = await entrar({});
        const html = await (await fetch(base + "/fotos-estudantes/2", { headers: { Cookie: cookie } })).text();
        const csrf = /name="csrf-token" content="([a-f0-9]{64})"/.exec(html)[1];
        const identificacao = /id="identificacao-foto" type="hidden" value="([^"]+)"/.exec(html)[1];
        const headers = { Cookie: cookie, "Content-Type": "image/jpeg", "X-CSRF-Token": csrf, "X-Identificacao-Aluno": identificacao };
        for (const token of ["", "é".repeat(64), "b".repeat(64)]) {
            assert.equal((await fetch(base + "/fotos-estudantes/api/fotos", { method: "POST", headers: { ...headers, "X-CSRF-Token": token }, body: imagem() })).status, 403);
        }
        assert.equal((await fetch(base + "/fotos-estudantes/api/fotos", { method: "POST", headers: { ...headers, "Content-Type": "image/svg+xml" }, body: "<svg/>" })).status, 415);
        assert.equal((await fetch(base + "/fotos-estudantes/api/fotos", { method: "POST", headers, body: Buffer.alloc(200 * 1024 + 1) })).status, 413);
        assert.equal((await fetch(base + "/mercadinho/api/fotos", { method: "POST", headers, body: imagem() })).status, 404);
        assert.equal(db.state.fotos.size, 0);
        assert.equal((await fetch(base + "/fotos-estudantes/api/fotos", { method: "POST", headers, body: imagem() })).status, 200);
        const foto = await fetch(base + "/mercadinho/api/fotos/2", { headers: { Cookie: cookie } });
        assert.equal(foto.status, 200); assert.equal(foto.headers.get("content-type"), "image/jpeg");
        assert.match(foto.headers.get("cache-control"), /no-store/);
        assert.equal(foto.headers.get("x-content-type-options"), "nosniff");
        assert.equal((await fetch(base + "/mercadinho/api/fotos/1", { headers: { Cookie: cookie } })).status, 204);
    } finally { await new Promise(resolve => server.close(resolve)); }
});

test("gestão de fotos é independente do caixa e não expõe QR na lista nem no editor", async () => {
    const db = criarBancoFalso(), app = express();
    db.state.contas.get(20).nome = "Estudante <img src=x onerror=alert(1)>";
    app.use(express.json()); app.use(session({ secret: "apenas-teste-fotos-admin", resave: false, saveUninitialized: false }));
    app.set("view engine", "ejs"); app.set("views", path.join(__dirname, "..", "api", "views"));
    app.post("/teste/login", (req, res) => { req.session.usuario = { id: 5 }; res.end(); });
    app.use("/fotos-estudantes", criarRotasGestaoFotos(db));
    const server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        assert.equal((await fetch(base + "/fotos-estudantes", { redirect: "manual" })).status, 302);
        const cookie = (await fetch(base + "/teste/login", { method: "POST" })).headers.get("set-cookie").split(";")[0];
        const ler = rota => fetch(base + rota, { headers: { Cookie: cookie } });
        for (const rota of ["/fotos-estudantes", "/fotos-estudantes/2"]) {
            const resposta = await ler(rota), html = await resposta.text();
            assert.equal(resposta.status, 200); assert.match(resposta.headers.get("cache-control"), /no-store/);
            assert.match(html, /Estudante &lt;img/); assert.doesNotMatch(html, /<img src=x/);
            assert.doesNotMatch(html, /b{48}|DEF456|qr_code/);
        }
        assert.equal((await ler("/fotos-estudantes/2abc")).status, 400);
        assert.equal((await ler("/fotos-estudantes/999")).status, 404);
        assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.fotos.size, 0);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
