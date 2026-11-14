"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express"), session = require("express-session"), path = require("node:path");
const pesquisa = require("../public/js/pesquisa-cadastros");
const { criarRotasPesquisaCadastros } = require("../api/routes/pesquisaCadastrosRouter");
const { criarController } = require("../api/controllers/mercadinhoController");
const { criarServico } = require("../api/services/mercadinhoService");
const { criarBancoFalso } = require("./mercadinho.fake-db");

test("pesquisa combina nome sem acento, turma e ano sem confundir a letra da turma com o nome", () => {
    const alunos = [pesquisa.dados("Ana Cláudia", "7A"), pesquisa.dados("Ana Maria", "7B"), pesquisa.dados("João D'Ávila", "8º ano A"), pesquisa.dados("Maria Clara", "1ª série C")];
    const filtrar = consulta => alunos.map((a, i) => pesquisa.corresponde(a, consulta) ? i : null).filter(i => i !== null);
    for (const q of ["ANA CLAUDIA", "ana 7a", "7º ano A", "7 A ana", "turma a 7"]) assert.deepEqual(filtrar(q), [0], q);
    assert.deepEqual(filtrar("7º ano"), [0, 1]);
    assert.deepEqual(filtrar("joao avila 8a"), [2]);
    assert.deepEqual(filtrar("1º ano C"), [3]);
    assert.deepEqual(filtrar(""), [0, 1, 2, 3]);
    assert.deepEqual(filtrar("2026"), []);
    assert.deepEqual(filtrar("<img onerror=alert(1)>"), []);
});

test("pesquisa de texto filtra registros de extrato já disponíveis", () => {
    const registro = pesquisa.dados("15/10/2026 Compra Caderno SAIDA 2,50", "", true);
    assert.equal(pesquisa.corresponde(registro, "2026 caderno"), true);
    assert.equal(pesquisa.corresponde(registro, "entrada"), false);
});

test("consulta por id recusa valores inválidos e não cria conta ou movimentação", async () => {
    const db = criarBancoFalso(), servico = criarServico(db);
    for (const id of [0, -1, 1.5, [], {}, null, "1 OR 1=1", "1e0"]) await assert.rejects(servico.buscarAlunoPorId(id), { status: 400 });
    const conta = await servico.buscarAlunoPorId(2);
    assert.equal(conta.id_aluno, 2); assert.equal(conta.id_conta, 20); assert.equal(conta.saldo, "7.00");
    await assert.rejects(servico.buscarAlunoPorId(999), { status: 404 });
    db.state.contas.get(20).status = 0;
    await assert.rejects(servico.buscarAlunoPorId(2), { status: 409 });
    assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.contas.get(20).saldo, "7.00"); assert.equal(db.state.contas.size, 2);
});

test("pesquisa administrativa protege os cadastros e a seleção do caixa com sessão e CSRF", async () => {
    const db = criarBancoFalso(), app = express(), c = criarController(db);
    app.use(express.json()); app.use(session({ secret: "somente-pesquisa-ficticia", resave: false, saveUninitialized: false }));
    app.set("view engine", "ejs"); app.set("views", path.join(__dirname, "../api/views"));
    app.post("/teste/login", (req, res) => { req.session[req.body.aluno ? "aluno" : "usuario"] = { id: 5, nome: "Operador fictício" }; res.end(); });
    app.use("/cadastros/pesquisa", criarRotasPesquisaCadastros(db));
    app.get("/mercadinho", c.exigirAdmin, c.exibir);
    app.post("/mercadinho/api/aluno-por-id", c.exigirAdmin, c.exigirCsrf, c.buscarPorId);
    const server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        const entrar = async aluno => (await fetch(base + "/teste/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aluno }) })).headers.get("set-cookie").split(";")[0];
        const alunoCookie = await entrar(true);
        for (const rota of ["estudantes", "turmas"]) {
            assert.equal((await fetch(base + "/cadastros/pesquisa/" + rota)).status, 401);
            assert.equal((await fetch(base + "/cadastros/pesquisa/" + rota, { headers: { Cookie: alunoCookie } })).status, 401);
        }
        const cookie = await entrar(false);
        const lista = await fetch(base + "/cadastros/pesquisa/estudantes", { headers: { Cookie: cookie } });
        const estudantes = (await lista.json()).estudantes;
        assert.match(lista.headers.get("cache-control"), /no-store/);
        assert.deepEqual(Object.keys(estudantes[0]).sort(), ["id_aluno", "nome", "turma"]);
        const turmas = await (await fetch(base + "/cadastros/pesquisa/turmas", { headers: { Cookie: cookie } })).json();
        assert.equal(turmas.turmas.length, 3);
        const html = await (await fetch(base + "/mercadinho", { headers: { Cookie: cookie } })).text();
        const csrf = /name="csrf-token" content="([a-f0-9]+)"/.exec(html)[1];
        const enviar = (headers, body = { id_aluno: 2 }) => fetch(base + "/mercadinho/api/aluno-por-id", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
        assert.equal((await enviar({ Cookie: alunoCookie, "X-CSRF-Token": csrf })).status, 401);
        assert.equal((await enviar({ Cookie: cookie })).status, 403);
        const resposta = await enviar({ Cookie: cookie, "X-CSRF-Token": csrf });
        assert.equal(resposta.status, 200);
        const aluno = (await resposta.json()).aluno;
        const payload = JSON.parse(Buffer.from(aluno.identificacao.split(".")[0], "base64url").toString());
        assert.equal(payload.aluno, 2); assert.equal(payload.conta, 20); assert.equal(payload.usuario, 5);
        assert.equal(aluno.saldo, "7.00");
        assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.operacoes.size, 0);
        assert.equal(db.state.fotos.size, 0); assert.equal(db.state.contas.size, 2);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
