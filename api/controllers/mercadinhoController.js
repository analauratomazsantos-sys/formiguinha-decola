"use strict";

const crypto = require("crypto");
const { criarServico, assinarIdentificacao, ErroCaixa } = require("../services/mercadinhoService");
const { ErroAcesso } = require("../services/acessoFuncionarioService");
const { criarProtecao } = require("../middlewares/acessoFuncionarios");

function criarController(db) {
    const servico = criarServico(db);
    const protecao = criarProtecao(db);

    function exigirAdmin(req, res, next) {
        res.set("Cache-Control", "no-store, private");
        res.vary("Cookie");
        const id = Number(req.session?.usuario?.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            if (req.path === "/" && req.method === "GET") return res.redirect("/login");
            return res.status(401).json({ erro: "Sua sessão terminou. Entre novamente no painel administrativo.", definitivo: true });
        }
        return protecao.exigirOperador(req, res, next);
    }

    function csrfValido(req) {
        const esperado = req.session.mercadinhoCsrf;
        const recebido = req.get("X-CSRF-Token");
        return typeof esperado === "string" && typeof recebido === "string" && /^[a-f0-9]{64}$/.test(recebido) && esperado.length === recebido.length &&
            crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido));
    }

    function exigirCsrf(req, res, next) {
        if (!csrfValido(req)) {
            return res.status(403).json({ erro: "Atualize a página antes de continuar.", definitivo: true });
        }
        if (!req.is("application/json")) return res.status(415).json({ erro: "Formato de envio inválido.", definitivo: true });
        next();
    }

    function falha(res, erro) {
        if (erro instanceof ErroCaixa || erro instanceof ErroAcesso) return res.status(erro.status).json({ erro: erro.message, ...erro.detalhes, definitivo: true });
        // Não registrar corpo da requisição, QR, nomes, credenciais ou mensagens SQL.
        console.error("Falha no caixa:", erro.code || "ERRO_INTERNO");
        if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(erro.code)) {
            return res.status(503).json({ erro: "O caixa precisa concluir sua preparação no banco. Avise a responsável pelo sistema.", definitivo: true });
        }
        // Em falhas de rede, o cliente conserva a mesma chave para consultar/repetir.
        return res.status(503).json({ erro: "Não foi possível confirmar a resposta do banco. Use Consultar / tentar novamente para conferir esta mesma operação.", definitivo: false });
    }

    function exibir(req, res) {
        if (!req.session.mercadinhoCsrf) req.session.mercadinhoCsrf = crypto.randomBytes(32).toString("hex");
        if (!req.session.mercadinhoSegredo) req.session.mercadinhoSegredo = crypto.randomBytes(32).toString("hex");
        res.set("Referrer-Policy", "no-referrer");
        return res.render("mercadinho", { csrf: req.session.mercadinhoCsrf, usuario: req.session.usuario });
    }

    async function responderBusca(req, res, porId) {
        try {
            if (!req.session.mercadinhoSegredo) throw new ErroCaixa(403, "Atualize a página antes de continuar.");
            const aluno = porId ? await servico.buscarAlunoPorId(req.body?.id_aluno) : await servico.buscarAluno(req.body?.codigo);
            return res.json({ aluno: {
                nome: aluno.nome, turma: aluno.turma, saldo: aluno.saldo,
                identificacao: assinarIdentificacao(aluno, req.session.usuario.id, req.session.mercadinhoSegredo),
                foto_url: `/mercadinho/api/fotos/${aluno.id_aluno}`
            } });
        } catch (erro) { return falha(res, erro); }
    }
    const buscar = (req, res) => responderBusca(req, res, false);
    const buscarPorId = (req, res) => responderBusca(req, res, true);

    async function registrar(req, res) {
        try {
            const recibo = await servico.registrar(req.body, req.session.usuario.id, req.session.mercadinhoSegredo);
            return res.json({ recibo });
        } catch (erro) { return falha(res, erro); }
    }

    async function recibo(req, res) {
        try {
            const resultado = await servico.consultarRecibo(req.params.id, req.session.usuario.id);
            return res.json({ recibo: resultado });
        } catch (erro) { return falha(res, erro); }
    }
    return { exigirAdmin, exigirAdministrador: protecao.exigirAdministrador, exigirCsrf, exibir, buscar, buscarPorId, registrar, recibo };
}

module.exports = { criarController };
