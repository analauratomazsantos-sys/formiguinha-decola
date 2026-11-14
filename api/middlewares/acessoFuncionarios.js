"use strict";
const { carregarAcesso, publico, operavel, administrador, csrf, conferirCsrf, ErroAcesso } = require("../services/acessoFuncionarioService");
const json = req => req.originalUrl.includes("/api/") || req.is("application/json") || (req.get("Accept") || "").includes("application/json");
function responderFalha(req, res, erro) {
    const conhecida = erro instanceof ErroAcesso;
    if (!conhecida) console.error("Falha no acesso:", erro.code || "ERRO_INTERNO");
    const status = conhecida ? erro.status : 503;
    const mensagem = conhecida ? erro.message : "Os acessos precisam concluir sua preparação. Avise a administração.";
    if (json(req)) return res.status(status).json({ erro: mensagem, definitivo: conhecida, ...(conhecida ? erro.detalhes : {}) });
    if (status === 401 && req.method === "GET" && req.path === "/") return res.redirect("/login");
    return res.status(status).send(mensagem);
}
function criarProtecao(db) {
    async function obter(req) {
        if (req.acessoAtual) return req.acessoAtual;
        const sessao = req.session?.usuario;
        if (!sessao || !Number.isSafeInteger(Number(sessao.id)) || Number(sessao.id) <= 0) throw new ErroAcesso(401, "Entre no sistema para continuar.");
        const acesso = await carregarAcesso(db, sessao.id);
        if ((sessao.versao !== undefined || acesso.perfil === "FUNCIONARIO") && Number(sessao.versao) !== Number(acesso.versao_sessao)) throw new ErroAcesso(401, "Sua sessão terminou. Entre novamente.");
        req.acessoAtual = acesso; return acesso;
    }
    async function exigirOperador(req, res, next) {
        res.set("Cache-Control", "no-store, private"); res.vary("Cookie");
        try { operavel(await obter(req)); next(); } catch (erro) { return responderFalha(req, res, erro); }
    }
    async function exigirAdministrador(req, res, next) {
        res.set("Cache-Control", "no-store, private"); res.vary("Cookie");
        try { administrador(await obter(req)); next(); } catch (erro) { return responderFalha(req, res, erro); }
    }
    function exigirCsrf(req, res, next) {
        try { conferirCsrf(req); next(); } catch (erro) { return responderFalha(req, res, erro); }
    }
    async function atualizar(req, res, next) {
        res.locals.acesso = null;
        if (!req.session?.usuario) return next();
        res.set("Cache-Control", "no-store, private"); res.vary("Cookie"); res.set("Referrer-Policy", "no-referrer");
        try {
            const acesso = await obter(req); res.locals.acesso = publico(acesso); res.locals.acessoCsrf = csrf(req);
            if (Number(acesso.trocar_senha) === 1 && !["/minha-senha", "/sair", "/login", "/"].includes(req.path)) {
                if (json(req)) throw new ErroAcesso(403, "Defina sua senha pessoal antes de continuar.");
                return res.redirect("/minha-senha");
            }
            if (acesso.perfil === "FUNCIONARIO") {
                const paginas = /^\/(?:|login|painel|minha-senha|minha-cota|sair|saldo|extrato|lrcash|estudantes(?:\/novo|\/[0-9]+)?|folhapay(?:\/[0-9]+(?:\/qr\.svg)?)?|cadastros\/pesquisa\/(?:estudantes|turmas)|mercadinho(?:\/api\/(?:fotos\/[0-9]+|recibos\/[a-f0-9-]+))?|acessos\/api\/operacoes\/(?:DISTRIBUICAO|LIBERACAO)\/[a-f0-9-]+)\/?$/i;
                const envio = ["/login", "/minha-senha", "/estudantes", "/lrcash", "/mercadinho/api/aluno", "/mercadinho/api/aluno-por-id", "/mercadinho/api/movimentacoes"].includes(req.path);
                if (!(req.method === "GET" && paginas.test(req.path) || req.method === "POST" && envio)) throw new ErroAcesso(403, "Esta área é exclusiva da administração.");
            }
            if (req.method === "POST" && req.path === "/estudantes") conferirCsrf(req);
            next();
        } catch (erro) {
            if (erro instanceof ErroAcesso && erro.status === 401) {
                delete req.session.usuario; delete req.acessoAtual;
                if (["/", "/login"].includes(req.path)) return next();
            }
            return responderFalha(req, res, erro);
        }
    }
    return { obter, exigirOperador, exigirAdministrador, exigirCsrf, atualizar };
}
module.exports = { criarProtecao, responderFalha };
