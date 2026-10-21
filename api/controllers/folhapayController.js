"use strict";

const gerarQr = require("../vendor/qrcode-generator/qrcode");
const { normalizarCodigo, ErroCaixa } = require("../services/mercadinhoService");

function criarControllerFolhaPay(db) {
    function falha(res, erro) {
        if (erro instanceof ErroCaixa) return res.status(erro.status).send(erro.message);
        console.error("Falha na FolhaPay:", erro.code || "ERRO_INTERNO");
        return res.status(503).send("Não foi possível consultar a FolhaPay agora. Tente novamente em alguns instantes.");
    }
    async function alunoPorId(valor) {
        const id = Number(valor);
        if (!/^\d+$/.test(String(valor)) || !Number.isSafeInteger(id) || id <= 0) throw new ErroCaixa(400, "Identificador do aluno inválido.");
        const [rows] = await db.execute(`SELECT a.id_aluno, a.nome, a.qr_code, a.codigo_acesso, t.nome_turma AS turma
            FROM aluno a LEFT JOIN turma t ON t.id_turma = a.id_turma
            WHERE a.id_aluno = ? LIMIT 1`, [id]);
        if (rows.length !== 1) throw new ErroCaixa(404, "Aluno não encontrado.");
        const aluno = rows[0];
        try { aluno.qr_disponivel = normalizarCodigo(aluno.qr_code).tipo === "qr"; }
        catch { aluno.qr_disponivel = false; }
        const acesso = String(aluno.codigo_acesso || "").trim().toUpperCase();
        aluno.codigo_portal = /^[A-Z0-9]{6}$/.test(acesso) ? acesso : "";
        aluno.rotulo_portal = aluno.qr_disponivel && acesso === String(aluno.qr_code).slice(0, 6).toUpperCase()
            ? "ACESSO AO PORTAL: 6 PRIMEIROS CARACTERES" : "CÓDIGO DE ACESSO AO PORTAL";
        return aluno;
    }
    async function listar(req, res) {
        try {
            // A lista não carrega QR, RA ou códigos de acesso; o cartão é aberto individualmente.
            const [alunos] = await db.execute(`SELECT a.id_aluno, a.nome, t.nome_turma AS turma
                FROM aluno a LEFT JOIN turma t ON t.id_turma = a.id_turma ORDER BY a.nome, a.id_aluno`);
            return res.render("folhapay", { alunos, aluno: null });
        } catch (erro) { return falha(res, erro); }
    }
    async function cartao(req, res) {
        try { return res.render("folhapay", { alunos: [], aluno: await alunoPorId(req.params.id) }); }
        catch (erro) { return falha(res, erro); }
    }
    async function qr(req, res) {
        try {
            const aluno = await alunoPorId(req.params.id);
            if (!aluno.qr_disponivel) throw new ErroCaixa(404, "O QR deste aluno precisa ser conferido no cadastro.");
            const codigo = gerarQr(0, "M");
            codigo.addData(String(aluno.qr_code), "Byte"); codigo.make();
            res.set({ "Content-Type": "image/svg+xml; charset=utf-8", "X-Content-Type-Options": "nosniff",
                "Cross-Origin-Resource-Policy": "same-origin", "Content-Security-Policy": "default-src 'none'; sandbox" });
            return res.send(codigo.createSvgTag({ cellSize: 5, margin: 20, scalable: true }));
        } catch (erro) { return falha(res, erro); }
    }
    return { listar, cartao, qr };
}

module.exports = { criarControllerFolhaPay };
