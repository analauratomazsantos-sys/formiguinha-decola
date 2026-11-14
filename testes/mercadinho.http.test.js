"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const session = require("express-session");
const { criarController } = require("../api/controllers/mercadinhoController");
const { criarBancoFalso } = require("./mercadinho.fake-db");

test("HTTP: acesso, sessão, CSRF, renderização e lançamento", async t => {
    const db = criarBancoFalso();
    const app = express();
    app.use(express.json());
    app.use(session({ secret: crypto.randomBytes(32).toString("hex"), resave: false, saveUninitialized: false }));
    app.set("view engine", "ejs"); app.set("views", path.join(__dirname, "..", "api", "views"));
    // Rota somente deste teste, em servidor temporário vinculado a 127.0.0.1.
    app.post("/__teste/sessao", (req, res) => {
        if (req.body.papel === "admin") req.session.usuario = { id: 5, nome: "Operador <teste>" };
        else req.session.aluno = { id: 1 };
        res.json({ ok: true });
    });
    const c = criarController(db); const router = express.Router();
    router.use(c.exigirAdmin); router.get("/", c.exibir);
    router.post("/api/aluno", c.exigirCsrf, c.buscar);
    router.post("/api/movimentacoes", c.exigirCsrf, c.registrar);
    router.get("/api/recibos/:id", c.recibo); app.use("/mercadinho", router);
    const server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    const url = `http://127.0.0.1:${server.address().port}`;
    const login = async papel => (await fetch(`${url}/__teste/sessao`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ papel }) })).headers.get("set-cookie").split(";")[0];
    let cookie; let csrf; let aluno;
    try {
        await t.test("visitante é redirecionado no HTML e recebe 401 na API", async () => {
            const pagina = await fetch(`${url}/mercadinho`, { redirect: "manual" }); assert.equal(pagina.status, 302); assert.equal(pagina.headers.get("location"), "/login");
            const api = await fetch(`${url}/mercadinho/api/aluno`, { method: "POST" }); assert.equal(api.status, 401);
        });
        await t.test("sessão de aluno não autoriza o caixa administrativo", async () => {
            const cookieAluno = await login("aluno");
            const r = await fetch(`${url}/mercadinho/api/aluno`, { method: "POST", headers: { Cookie: cookieAluno } }); assert.equal(r.status, 401);
        });
        await t.test("administrador abre a tela, com nome escapado e sem cache", async () => {
            cookie = await login("admin");
            const r = await fetch(`${url}/mercadinho`, { headers: { Cookie: cookie } });
            const html = await r.text();
            assert.equal(r.status, 200); assert.match(html, /Operador &lt;teste&gt;/);
            assert.match(html, /<h1>Caixa do Armazém<\/h1>/);
            assert.doesNotMatch(html, /id="(?:arquivo-foto|cadastrar-foto|salvar-foto|cancelar-foto)"/);
            assert.match(r.headers.get("cache-control"), /no-store/);
            csrf = /name="csrf-token" content="([a-f0-9]{64})"/.exec(html)[1];
        });
        await t.test("token CSRF ausente, diferente ou Unicode é recusado", async () => {
            for (const token of ["", "z".repeat(64), "é".repeat(64)]) {
                const r = await fetch(`${url}/mercadinho/api/aluno`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": token }, body: '{"codigo":"ABC123"}' });
                assert.equal(r.status, 403);
            }
        });
        await t.test("busca devolve só os dados necessários e não depende do RA", async () => {
            const r = await fetch(`${url}/mercadinho/api/aluno`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: '{"codigo":"DEF456"}' });
            assert.equal(r.status, 200); aluno = (await r.json()).aluno;
            assert.deepEqual(Object.keys(aluno).sort(), ["foto_url", "identificacao", "nome", "saldo", "turma"]);
            assert.equal(aluno.saldo, "7.00");
        });
        await t.test("compra com sessão e CSRF válidos registra no saldo e recibo", async () => {
            const body = { id_operacao: crypto.randomUUID(), identificacao: aluno.identificacao, tipo: "SAIDA", valor: "2.35", saldo_esperado: aluno.saldo, descricao: "Lápis de teste" };
            const r = await fetch(`${url}/mercadinho/api/movimentacoes`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(body) });
            assert.equal(r.status, 200); const recibo = (await r.json()).recibo;
            assert.equal(recibo.saldo_posterior, "4.65"); assert.equal(db.state.movimentos.length, 1);
        });
    } finally { await new Promise(resolve => server.close(resolve)); }
});
