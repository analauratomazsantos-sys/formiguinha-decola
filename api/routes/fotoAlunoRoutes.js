"use strict";

const express = require("express");
const { criarServicoFotos } = require("../services/fotoAlunoService");
const { ErroCaixa } = require("../services/mercadinhoService");

function criarRotasFotos(db, protecao, { permitirEdicao = false } = {}) {
    const router = express.Router(), servico = criarServicoFotos(db);
    router.use(protecao.exigirAdmin);
    const receber = express.raw({ type: "image/jpeg", limit: "200kb" });
    function falha(res, erro) {
        if (erro instanceof ErroCaixa) return res.status(erro.status).json({ erro: erro.message, ...erro.detalhes });
        console.error("Falha no cadastro de foto:", erro.code || "ERRO_INTERNO");
        return res.status(503).json({ erro: "Não foi possível concluir o cadastro da foto agora." });
    }
    router.get("/:id", async (req, res) => {
        try {
            const foto = await servico.consultar(req.params.id);
            if (!foto) return res.status(204).end();
            res.set({ "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff",
                "Cross-Origin-Resource-Policy": "same-origin", "Referrer-Policy": "no-referrer" });
            return res.send(foto.imagem);
        } catch (erro) { return falha(res, erro); }
    });
    if (permitirEdicao) router.post("/", protecao.exigirCsrfFoto, (req, res, next) => {
        receber(req, res, erro => erro
            ? res.status(erro.type === "entity.too.large" ? 413 : 400).json({ erro: "A foto preparada deve ter no máximo 200 KB." })
            : next());
    }, async (req, res) => {
        try {
            const resultado = await servico.salvar(req.body, req.get("X-Identificacao-Aluno"), Number(req.session.usuario.id), req.session.fotoAlunoSegredo);
            return res.json(resultado);
        } catch (erro) { return falha(res, erro); }
    });
    return router;
}

module.exports = { criarRotasFotos };
