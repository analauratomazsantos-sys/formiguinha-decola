"use strict";
const express = require("express");
const { criarControllerAcessos } = require("../controllers/acessosController");
const { criarProtecao } = require("../middlewares/acessoFuncionarios");
function criarRotasAcessos(db) {
    const router = express.Router(), c = criarControllerAcessos(db), p = criarProtecao(db);
    router.use(p.atualizar);
    router.get(["/", "/login"], c.login);
    router.post("/login", c.autenticar);
    // A senha inicial dá acesso somente à troca de senha e à saída da sessão.
    const exigirSessao = async (req, res, next) => {
        try { await p.obter(req); next(); } catch { return res.redirect("/login"); }
    };
    router.get("/minha-senha", exigirSessao, c.senha);
    router.post("/minha-senha", exigirSessao, c.definirSenha);
    router.get("/equipe", p.exigirAdministrador, c.equipe);
    router.post("/equipe/liberar", p.exigirAdministrador, p.exigirCsrf, c.liberar);
    router.get("/equipe/funcionarios/:id/senha", p.exigirAdministrador, c.senhaFuncionario);
    router.post("/equipe/funcionarios/:id/senha", p.exigirAdministrador, p.exigirCsrf, c.definirSenhaFuncionario);
    router.get("/minha-cota", p.exigirOperador, c.minhaCota);
    router.get("/lrcash", p.exigirOperador, c.lancamento);
    router.post("/lrcash", p.exigirOperador, p.exigirCsrf, c.distribuir);
    router.get("/acessos/api/operacoes/:origem/:id", p.exigirOperador, c.recibo);
    return router;
}
module.exports = { criarRotasAcessos };
