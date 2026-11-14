"use strict";

const crypto = require("node:crypto");
const { ErroCaixa } = require("../services/mercadinhoService");
const { assinarEdicaoFoto } = require("../services/fotoAlunoIdentificacao");

function criarControllerFotos(db) {
    function falha(res, erro) {
        if (erro instanceof ErroCaixa) return res.status(erro.status).send(erro.message);
        console.error("Falha na edição de foto:", erro.code || "ERRO_INTERNO");
        return res.status(503).send("Não foi possível consultar os estudantes agora. Tente novamente em alguns instantes.");
    }
    async function listar(req, res) {
        try {
            const [alunos] = await db.execute(`SELECT a.id_aluno, a.nome, t.nome_turma AS turma
                FROM aluno a LEFT JOIN turma t ON t.id_turma = a.id_turma ORDER BY a.nome, a.id_aluno`);
            return res.render("fotos-estudantes", { alunos, aluno: null, csrf: "" });
        } catch (erro) { return falha(res, erro); }
    }
    async function editar(req, res) {
        try {
            const id = Number(req.params.id);
            if (!/^\d+$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id <= 0) {
                throw new ErroCaixa(400, "Identificador do estudante inválido.");
            }
            const [alunos] = await db.execute(`SELECT a.id_aluno, a.nome, t.nome_turma AS turma
                FROM aluno a LEFT JOIN turma t ON t.id_turma = a.id_turma WHERE a.id_aluno = ? LIMIT 1`, [id]);
            if (alunos.length !== 1) throw new ErroCaixa(404, "Estudante não encontrado.");
            if (!req.session.fotoAlunoCsrf) req.session.fotoAlunoCsrf = crypto.randomBytes(32).toString("hex");
            if (!req.session.fotoAlunoSegredo) req.session.fotoAlunoSegredo = crypto.randomBytes(32).toString("hex");
            const aluno = { ...alunos[0], identificacao: assinarEdicaoFoto(id, req.session.usuario.id, req.session.fotoAlunoSegredo),
                foto_url: `/fotos-estudantes/api/fotos/${id}` };
            return res.render("fotos-estudantes", { alunos: [], aluno, csrf: req.session.fotoAlunoCsrf });
        } catch (erro) { return falha(res, erro); }
    }
    function exigirCsrfFoto(req, res, next) {
        const esperado = req.session.fotoAlunoCsrf, recebido = req.get("X-CSRF-Token");
        if (typeof esperado !== "string" || typeof recebido !== "string" || !/^[a-f0-9]{64}$/.test(recebido) ||
            recebido.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado))) {
            return res.status(403).json({ erro: "Atualize a página do estudante antes de cadastrar a foto." });
        }
        if (!req.is("image/jpeg")) return res.status(415).json({ erro: "Envie a foto JPEG preparada pelo sistema." });
        next();
    }
    return { listar, editar, exigirCsrfFoto };
}

module.exports = { criarControllerFotos };
