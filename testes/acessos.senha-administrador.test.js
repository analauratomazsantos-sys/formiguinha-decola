"use strict";
const { test } = require("node:test"), assert = require("node:assert/strict"), path = require("node:path");
const express = require("express"), session = require("express-session"), bcrypt = require("bcryptjs");
const { criarBancoFalso } = require("./mercadinho.fake-db");
const { criarRotasAcessos } = require("../api/routes/acessosRouter");
const { trocarSenhaFuncionario } = require("../api/services/acessoFuncionarioService");

test("administrador troca a senha pela tabela; funcionário e requisições sem confirmação são bloqueados", async () => {
    const db = criarBancoFalso(), adminSenha = "Senha fictícia da administradora", antiga = "senha antiga fictícia";
    db.state.usuarios.get(5).senha_hash = await bcrypt.hash(adminSenha, 4);
    db.state.usuarios.get(6).senha_hash = await bcrypt.hash(antiga, 4); db.state.usuarios.get(6).saldo_cota = "75.00";
    db.state.usuarios.set(7, { ...db.state.usuarios.get(6), id_usuario: 7, nome: "Outro funcionário fictício", email: "def999", codigo_acesso: "DEF999" });
    const app = express(); app.use(express.urlencoded({ extended: true })); app.use(express.json());
    app.use(session({ secret: "troca-administrativa-apenas-teste", resave: false, saveUninitialized: false }));
    app.set("view engine", "ejs"); app.set("views", path.join(__dirname, "../api/views")); app.use(criarRotasAcessos(db));
    app.get("/painel", (req, res) => res.render("painel"));
    const server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`, rota = "/equipe/funcionarios/6/senha";
    const token = html => /name="_csrf" value="([a-f0-9]{64})"/.exec(html)[1];
    function cliente() {
        let cookie = "";
        return { async request(url, body) {
            const r = await fetch(base + url, { method: body ? "POST" : "GET", redirect: "manual", headers: { Cookie: cookie, ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) }, body: body ? new URLSearchParams(body).toString() : undefined });
            if (r.headers.get("set-cookie")) cookie = r.headers.get("set-cookie").split(";")[0]; return r;
        } };
    }
    async function entrar(c, usuario, senha) {
        const html = await (await c.request("/login")).text(); return c.request("/login", { _csrf: token(html), email: usuario, senha });
    }
    const admin = cliente(), funcionario = cliente(), outro = cliente(), anonimo = cliente();
    try {
        assert.equal((await anonimo.request(rota)).status, 401);
        await entrar(admin, "teste@formiguinha.local", adminSenha); await entrar(funcionario, "abc999", antiga); await entrar(outro, "def999", antiga);
        assert.equal((await funcionario.request(rota)).status, 403);
        assert.equal((await funcionario.request(rota, { nova: "2468", confirmacao: "2468", versao: "1" })).status, 403);
        const tabela = await (await admin.request("/equipe")).text();
        assert.match(tabela, /Disponível por funcionário/); assert.match(tabela, /href="\/equipe\/funcionarios\/6\/senha"/);
        let html = await (await admin.request(rota)).text();
        assert.match(html, /Professora fictícia/); assert.match(html, /minlength="4"/); assert.doesNotMatch(html, /senha_hash|senha antiga fictícia/);
        const original = db.state.usuarios.get(6).senha_hash, adminOriginal = structuredClone(db.state.usuarios.get(5));
        const dados = { _csrf: token(html), senhaAdministrador: adminSenha, nova: "2468", confirmacao: "2468", versao: "1" };
        assert.equal((await admin.request(rota, { ...dados, _csrf: "" })).status, 403);
        for (const alterar of [d => d.senhaAdministrador = "errada", d => d.confirmacao = "outra", d => { d.nova = "123"; d.confirmacao = "123"; }]) {
            const ruim = { ...dados }; alterar(ruim); const r = await admin.request(rota, ruim);
            assert.equal(r.status, 400); html = await r.text(); assert.match(html, /role="alert"/); assert.doesNotMatch(html, /value="2468"/);
            assert.equal(db.state.usuarios.get(6).senha_hash, original); assert.equal(db.state.usuarios.get(6).versao_sessao, 1);
        }
        const r = await admin.request(rota, { ...dados, funcionarioId: "7" });
        assert.equal(r.status, 303); assert.equal(r.headers.get("location"), "/equipe?senha=alterada#disponivel-funcionario");
        assert.equal(await bcrypt.compare("2468", db.state.usuarios.get(6).senha_hash), true);
        assert.equal(db.state.usuarios.get(6).trocar_senha, 1); assert.equal(db.state.usuarios.get(6).versao_sessao, 2);
        assert.equal(db.state.usuarios.get(7).senha_hash, original, "o destino é o ID da rota, sem confiar no body");
        assert.equal((await funcionario.request("/minha-cota")).status, 401, "a sessão antiga é encerrada");
        assert.equal((await outro.request("/minha-cota")).status, 200, "outras sessões não são encerradas");
        assert.equal((await admin.request("/equipe")).status, 200); assert.deepEqual(db.state.usuarios.get(5), adminOriginal);
        assert.equal((await entrar(funcionario, "abc999", antiga)).status, 401);
        assert.equal((await entrar(funcionario, "abc999", "2468")).headers.get("location"), "/minha-senha");
        assert.equal((await funcionario.request("/minha-cota")).headers.get("location"), "/minha-senha");
        html = await (await funcionario.request("/minha-senha")).text();
        assert.equal((await funcionario.request("/minha-senha", { _csrf: token(html), atual: "2468", nova: "8642", confirmacao: "8642" })).headers.get("location"), "/painel");
        assert.equal(db.state.usuarios.get(6).saldo_cota, "75.00"); assert.equal(db.state.usuarios.get(6).ativo_legado, 0);
        assert.equal(db.state.contas.get(10).saldo, "20.00"); assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.cotas.size, 0);
    } finally { await new Promise(resolve => server.close(resolve)); }
});

test("troca administrativa recusa perfis indevidos, versões antigas e acessos inativos; falha reverte a senha", async () => {
    const db = criarBancoFalso(), senha = "Senha administrativa fictícia";
    db.state.usuarios.get(5).senha_hash = await bcrypt.hash(senha, 4);
    db.state.usuarios.get(6).senha_hash = await bcrypt.hash("antiga", 4); db.state.usuarios.get(6).saldo_cota = "90.00";
    db.state.usuarios.set(8, { ...db.state.usuarios.get(5), id_usuario: 8, email: "outro@admin.local" });
    await assert.rejects(trocarSenhaFuncionario(db, 6, 5, "antiga", "2468", 1), { status: 403 });
    await assert.rejects(trocarSenhaFuncionario(db, 5, 5, senha, "2468", 1), { status: 400 });
    await assert.rejects(trocarSenhaFuncionario(db, 5, 8, senha, "2468", 1), { status: 404 });
    await assert.rejects(trocarSenhaFuncionario(db, 5, 6, senha, "2468", 9), { status: 409 });
    db.state.usuarios.get(6).ativo = 0;
    await assert.rejects(trocarSenhaFuncionario(db, 5, 6, senha, "2468", 1), { status: 404 }); db.state.usuarios.get(6).ativo = 1;
    const antes = structuredClone([...db.state.usuarios]); db.state.falhar = "senha_funcionario";
    await assert.rejects(trocarSenhaFuncionario(db, 5, 6, senha, "2468", 1), { code: "ER_TEST_FAILURE" });
    assert.deepEqual([...db.state.usuarios], antes); assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.cotas.size, 0);
});

test("duas trocas da mesma versão não sobrescrevem silenciosamente a senha escolhida", async () => {
    const db = criarBancoFalso(), senha = "Senha administrativa fictícia";
    db.state.usuarios.get(5).senha_hash = await bcrypt.hash(senha, 4); db.state.usuarios.get(6).senha_hash = await bcrypt.hash("antiga", 4);
    const resultados = await Promise.allSettled([trocarSenhaFuncionario(db,5,6,senha,"2468",1),trocarSenhaFuncionario(db,5,6,senha,"1357",1)]);
    assert.equal(resultados.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(resultados.find(r => r.status === "rejected").reason.status, 409); assert.equal(db.state.usuarios.get(6).versao_sessao, 2);
    const posicao = resultados.findIndex(r => r.status === "fulfilled");
    assert.equal(await bcrypt.compare(["2468","1357"][posicao], db.state.usuarios.get(6).senha_hash), true);
});
