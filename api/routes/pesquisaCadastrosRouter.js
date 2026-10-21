"use strict";

const express = require("express");
const { criarController } = require("../controllers/mercadinhoController");

function criarRotasPesquisaCadastros(db) {
    const router = express.Router();
    router.use(criarController(db).exigirAdmin);
    router.use((req, res, next) => { res.set("Referrer-Policy", "no-referrer"); next(); });
    function falha(res, erro) {
        console.error("Falha na consulta dos cadastros:", erro.code || "ERRO_INTERNO");
        return res.status(503).json({ erro: "Não foi possível carregar a pesquisa agora. Tente novamente." });
    }
    router.get("/estudantes", async (req, res) => {
        try {
            const [linhas] = await db.execute(`SELECT a.id_aluno, a.nome, t.nome_turma AS turma
                FROM aluno a LEFT JOIN turma t ON t.id_turma = a.id_turma ORDER BY a.nome, a.id_aluno`);
            return res.json({ estudantes: linhas.map(a => ({ id_aluno: a.id_aluno, nome: a.nome, turma: a.turma || "" })) });
        } catch (erro) { return falha(res, erro); }
    });
    router.get("/turmas", async (req, res) => {
        try {
            const [linhas] = await db.execute("SELECT id_turma, nome_turma FROM turma ORDER BY nome_turma, id_turma");
            return res.json({ turmas: linhas.map(t => ({ id_turma: t.id_turma, nome_turma: t.nome_turma })) });
        } catch (erro) { return falha(res, erro); }
    });
    return router;
}

module.exports = { criarRotasPesquisaCadastros };
