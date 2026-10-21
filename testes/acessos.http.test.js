"use strict";
const { test } = require("node:test"), assert = require("node:assert/strict"), path = require("node:path"), crypto = require("node:crypto");
const express = require("express"), session = require("express-session"), bcrypt = require("bcryptjs");
const { criarBancoFalso } = require("./mercadinho.fake-db");
const { criarRotasAcessos } = require("../api/routes/acessosRouter");
const { criarController } = require("../api/controllers/mercadinhoController");
const { criarRotasGestaoFotos } = require("../api/routes/gestaoFotosRouter");
const { criarRotasFotos } = require("../api/routes/fotoAlunoRoutes");
const { validarNovaSenha } = require("../api/services/acessoFuncionarioService");

test("HTTP: login individual, troca de senha, cotas, caixa, cadastro e bloqueio de administração", async () => {
    const app = express(), db = criarBancoFalso();
    const senhaAdmin = "senha de administração fictícia", provisoria = "senha provisória do teste", pessoal = "1234";
    db.state.usuarios.get(5).senha_hash = await bcrypt.hash(senhaAdmin, 4);
    db.state.usuarios.get(6).senha_hash = await bcrypt.hash(provisoria, 4); db.state.usuarios.get(6).trocar_senha = 1;
    db.state.usuarios.set(7, { ...db.state.usuarios.get(6), id_usuario: 7, nome: "Outra professora fictícia", email: "def999", codigo_acesso: "DEF999", trocar_senha: 0 });
    app.use(express.json()); app.use(express.urlencoded({ extended: true }));
    app.use(session({ secret: "acessos-somente-fixtures-de-teste", resave: false, saveUninitialized: false }));
    app.set("view engine", "ejs"); app.set("views", path.join(__dirname, "../api/views"));
    app.use(criarRotasAcessos(db));
    app.get("/painel", (req, res) => res.render("painel"));
    app.get("/estudantes/novo", (req, res) => res.render("cadastro-estudante"));
    app.post("/estudantes", (req, res) => res.json({ operador: req.acessoAtual.id_usuario }));
    app.post("/lrcash", () => { throw Error("A rota antiga de crédito não pode ser chamada"); });
    app.get("/saldo", (req, res) => res.send("saldo consultado"));
    const c = criarController(db), r = express.Router(); r.use(c.exigirAdmin); r.get("/", c.exibir);
    r.post("/api/aluno-por-id", c.exigirCsrf, c.buscarPorId); r.post("/api/movimentacoes", c.exigirCsrf, c.registrar);
    r.use("/api/fotos", criarRotasFotos(db, c)); app.use("/mercadinho", r); app.use("/fotos-estudantes", criarRotasGestaoFotos(db));
    const server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    function cliente() {
        let cookie = "";
        return { async request(rota, body, headers = {}) {
            const json = body && typeof body !== "string";
            const r = await fetch(base + rota, { method: body === undefined ? "GET" : "POST", redirect: "manual", headers: { Cookie: cookie, ...(body === undefined ? {} : { "Content-Type": json ? "application/json" : "application/x-www-form-urlencoded" }), ...headers }, body: body === undefined ? undefined : json ? JSON.stringify(body) : body });
            const novo = r.headers.get("set-cookie"); if (novo) cookie = novo.split(";")[0]; return r;
        } };
    }
    const token = html => /name="_csrf" value="([a-f0-9]{64})"/.exec(html)[1];
    async function entrar(cliente, login, senha) {
        const html = await (await cliente.request("/login")).text();
        return cliente.request("/login", new URLSearchParams({ email: login, senha, _csrf: token(html) }).toString());
    }
    const admin = cliente(), prof = cliente(), antiga = cliente(), outra = cliente(), anonimo = cliente();
    try {
        assert.equal((await anonimo.request("/equipe")).status, 401);
        db.state.usuarios.get(6).ativo_legado = 1;
        assert.equal((await entrar(prof, "ABC999", provisoria)).status, 401, "funcionário habilitado no login legado deve ser recusado");
        db.state.usuarios.get(6).ativo_legado = 0;
        assert.equal((await entrar(prof, "ABC999", provisoria)).headers.get("location"), "/minha-senha");
        assert.equal((await entrar(antiga, "abc999", provisoria)).headers.get("location"), "/minha-senha");
        assert.equal((await prof.request("/lrcash")).headers.get("location"), "/minha-senha");
        assert.equal((await prof.request("/mercadinho/api/movimentacoes", {})).status, 403);
        let html = await (await prof.request("/minha-senha")).text();
        assert.match(html, /pelo menos 4 caracteres/);
        assert.equal((html.match(/minlength="4"/g) || []).length, 2);
        assert.doesNotMatch(html, /minlength="15"|15 caracteres/);
        const hashAntes = db.state.usuarios.get(6).senha_hash;
        assert.equal((await prof.request("/minha-senha", new URLSearchParams({ _csrf: token(html), atual: provisoria, nova: "123", confirmacao: "123" }).toString())).status, 400);
        assert.equal(db.state.usuarios.get(6).senha_hash, hashAntes); assert.equal(db.state.usuarios.get(6).trocar_senha, 1);
        assert.equal((await prof.request("/minha-senha", new URLSearchParams({ _csrf: token(html), atual: provisoria, nova: pessoal, confirmacao: pessoal }).toString())).headers.get("location"), "/painel");
        assert.equal(db.state.usuarios.get(6).trocar_senha, 0); assert.equal(db.state.usuarios.get(6).versao_sessao, 2);
        assert.equal(await bcrypt.compare(pessoal, db.state.usuarios.get(6).senha_hash), true);
        const sessaoPessoal = cliente();
        assert.equal((await entrar(sessaoPessoal, "ABC999", pessoal)).headers.get("location"), "/painel");
        assert.equal((await antiga.request("/lrcash")).status, 401);
        assert.equal((await prof.request("/fotos-estudantes")).status, 403);
        assert.equal((await prof.request("/fotos-estudantes/api/fotos", {})).status, 403);
        assert.equal((await prof.request("/equipe")).status, 403);
        assert.equal((await prof.request("/equipe/liberar", { funcionarioId: "6", valor: "100" })).status, 403);
        html = await (await prof.request("/painel")).text(); assert.doesNotMatch(html, /href="\/fotos-estudantes"/); assert.match(html, /href="\/minha-cota"/);
        assert.equal((await entrar(admin, "teste@formiguinha.local", senhaAdmin)).headers.get("location"), "/painel");
        html = await (await admin.request("/equipe")).text(); assert.match(html, /Professora fictícia/);
        const liberar = { id_operacao: crypto.randomUUID(), funcionarioId: "6", valor: "100.00", observacao: "Aulas" };
        assert.equal((await admin.request("/equipe/liberar", liberar)).status, 403);
        assert.equal((await admin.request("/equipe/liberar", liberar, { "X-CSRF-Token": token(html) })).status, 200);
        assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.usuarios.get(6).saldo_cota, "100.00");
        html = await (await prof.request("/lrcash")).text();
        const lancamento = { id_operacao: /name="id_operacao" value="([^"]+)"/.exec(html)[1], estudanteId: "1", criterio: "DISTRIBUICAO_AULA", valor: "10.00", observacao: "Aula" };
        const headers = { "X-CSRF-Token": token(html) };
        assert.equal((await prof.request("/lrcash", lancamento)).status, 403);
        assert.equal((await prof.request("/lrcash", lancamento, headers)).status, 200);
        assert.equal((await prof.request("/lrcash", lancamento, headers)).status, 200);
        assert.equal(db.state.usuarios.get(6).saldo_cota, "90.00"); assert.equal(db.state.movimentos.length, 1);
        await entrar(outra, "def999", provisoria);
        const privado = await (await outra.request(`/acessos/api/operacoes/DISTRIBUICAO/${lancamento.id_operacao}`)).json();
        assert.equal(privado.recibo, null);
        assert.doesNotMatch(await (await outra.request("/minha-cota")).text(), /Crédito ao estudante/);
        html = await (await prof.request("/mercadinho")).text();
        const csrfCaixa = /name="csrf-token" content="([a-f0-9]+)"/.exec(html)[1];
        const a = (await (await prof.request("/mercadinho/api/aluno-por-id", { id_aluno: 2 }, { "X-CSRF-Token": csrfCaixa })).json()).aluno;
        const compra = { id_operacao: crypto.randomUUID(), tipo: "ENTRADA", valor: "5.00", descricao: "Atividade em aula", saldo_esperado: a.saldo, identificacao: a.identificacao };
        assert.equal((await prof.request("/mercadinho/api/movimentacoes", compra, { "X-CSRF-Token": csrfCaixa })).status, 200);
        assert.equal(db.state.usuarios.get(6).saldo_cota, "85.00");
        assert.equal((await prof.request("/mercadinho/api/fotos/1")).status, 204);
        html = await (await prof.request("/estudantes/novo")).text();
        assert.equal((await prof.request("/estudantes", { nome: "Novo estudante fictício" })).status, 403);
        assert.equal((await prof.request("/estudantes", { _csrf: token(html), nome: "Novo estudante fictício" })).status, 200);
        db.state.usuarios.get(6).ativo = 0;
        assert.equal((await prof.request("/mercadinho/api/aluno-por-id", { id_aluno: 1 }, { "X-CSRF-Token": csrfCaixa })).status, 401);
        assert.equal(db.state.fotos.size, 0);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
test("senha pessoal aceita a partir de quatro caracteres e recusa valores menores ou truncados", () => {
    for (const senha of ["", "1", "12", "123", "abcd\u0000"]) assert.throws(() => validarNovaSenha(senha), { status: 400 });
    for (const senha of ["1234", "abcd", "aB7!", "curta"]) assert.doesNotThrow(() => validarNovaSenha(senha));
    assert.throws(() => validarNovaSenha("é".repeat(37)), { status: 400 });
    assert.doesNotThrow(() => validarNovaSenha("Uma frase pessoal para as aulas"));
});
