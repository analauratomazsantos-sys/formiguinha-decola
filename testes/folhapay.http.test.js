"use strict";

const { test } = require("node:test"), assert = require("node:assert/strict"), path = require("node:path");
const express = require("express"), session = require("express-session");
const { criarBancoFalso } = require("./mercadinho.fake-db");
const { criarRotasFolhaPay } = require("../api/routes/folhapayRouter");

test("FolhaPay restringe lista, cartão e QR aos administradores e usa o QR existente", async () => {
    const db = criarBancoFalso(), app = express(), consultas = [];
    db.state.contas.get(10).qr = "a".repeat(32);
    db.state.contas.get(20).nome = "Estudante <script>alert(1)</script>";
    db.state.alunosSemConta.push({ id_aluno: 3, nome: "Sem conta de teste", turma: null, qr_code: null });
    const somenteTeste = { execute(sql, p) { consultas.push(sql); return db.execute(sql, p); } };
    app.use(express.json()); app.use(session({ secret: "somente-testes-folhapay", resave: false, saveUninitialized: false }));
    app.set("view engine", "ejs"); app.set("views", path.join(__dirname, "..", "api", "views"));
    app.post("/teste/login", (req, res) => { req.session[req.body.aluno ? "aluno" : "usuario"] = { id: 5 }; res.end(); });
    app.use("/folhapay", criarRotasFolhaPay(somenteTeste));
    const server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        const listaVisitante = await fetch(base + "/folhapay", { redirect: "manual" });
        assert.equal(listaVisitante.status, 302); assert.equal(listaVisitante.headers.get("location"), "/login");
        for (const rota of ["/folhapay/1", "/folhapay/1/qr.svg"]) assert.equal((await fetch(base + rota)).status, 401);
        const entrar = async body => (await fetch(base + "/teste/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }))
            .headers.get("set-cookie").split(";")[0];
        const cookieAluno = await entrar({ aluno: true });
        assert.equal((await fetch(base + "/folhapay/1", { headers: { Cookie: cookieAluno } })).status, 401);
        const cookie = await entrar({});
        const ler = rota => fetch(base + rota, { headers: { Cookie: cookie } });
        const lista = await ler("/folhapay"), html = await lista.text();
        assert.equal(lista.status, 200); assert.match(lista.headers.get("cache-control"), /no-store/);
        assert.match(html, /Estudante &lt;script&gt;/); assert.doesNotMatch(html, /<script>alert/);
        assert.match(html, /Sem conta de teste/); assert.doesNotMatch(html, new RegExp("a".repeat(32)));
        assert.doesNotMatch(consultas[0], /qr_code|codigo_acesso/);
        const cartao = await ler("/folhapay/1"), cartaoHtml = await cartao.text();
        assert.match(cartaoHtml, /a{32}/); assert.match(cartaoHtml, /\/folhapay\/1\/qr.svg/);
        assert.match(cartaoHtml, /ABC123/); assert.doesNotMatch(cartaoHtml, /6 PRIMEIROS CARACTERES/);
        const qr = await ler("/folhapay/1/qr.svg");
        assert.equal(qr.status, 200); assert.match(qr.headers.get("content-type"), /image\/svg\+xml/);
        assert.match(qr.headers.get("cache-control"), /no-store/); assert.match(await qr.text(), /<svg/);
        const semQr = await ler("/folhapay/3"); assert.match(await semQr.text(), /precisa ser conferido/);
        assert.equal((await ler("/folhapay/3/qr.svg")).status, 404);
        assert.equal((await ler("/folhapay/999")).status, 404);
        assert.equal((await ler("/folhapay/1abc")).status, 400);
        assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.contas.get(10).qr, "a".repeat(32));
    } finally { await new Promise(resolve => server.close(resolve)); }
});
