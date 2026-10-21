"use strict";
const crypto = require("node:crypto"), bcrypt = require("bcryptjs");
const { CAMPOS_ACESSO, ErroAcesso, csrf, conferirCsrf, publico, trocarSenha, carregarFuncionario, trocarSenhaFuncionario } = require("../services/acessoFuncionarioService");
const { criarServicoCotas } = require("../services/cotaFuncionarioService");
const { responderFalha } = require("../middlewares/acessoFuncionarios");
function criarControllerAcessos(db) {
    const servico = criarServicoCotas(db), tentativas = new Map();
    const regenerar = req => new Promise((resolve, reject) => req.session.regenerate(e => e ? reject(e) : resolve()));
    const salvar = req => new Promise((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));
    function limite(req, login) {
        const agora = Date.now();
        for (const [chave, v] of tentativas) if (v.expira <= agora) tentativas.delete(chave);
        const chaves = [`ip:${req.ip}`, `login:${login}`];
        for (const chave of chaves) {
            const v = tentativas.get(chave) || { total: 0, expira: agora + 15 * 60 * 1000 };
            v.total++; tentativas.set(chave, v);
            if (v.total > (chave.startsWith("ip:") ? 100 : 15)) throw new ErroAcesso(429, "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.");
        }
        if (tentativas.size > 10000) tentativas.delete(tentativas.keys().next().value);
    }
    function login(req, res) {
        if (req.acessoAtual) return res.redirect(Number(req.acessoAtual.trocar_senha) ? "/minha-senha" : "/painel");
        res.set("Cache-Control", "no-store, private"); return res.render("login", { csrf: csrf(req), erro: "" });
    }
    async function autenticar(req, res) {
        try {
            conferirCsrf(req);
            const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
            const senha = req.body.senha;
            if (!email || email.length > 254 || typeof senha !== "string" || !senha || Buffer.byteLength(senha, "utf8") > 72) throw new ErroAcesso(401, "Usuário ou senha inválidos.");
            limite(req, email);
            const [rows] = await db.execute(`SELECT ${CAMPOS_ACESSO}, u.senha_hash FROM usuario u
                INNER JOIN usuario_acesso a ON a.id_usuario = u.id_usuario WHERE u.email = ? LIMIT 1`, [email]);
            const a = rows[0];
            if (!a || Number(a.ativo) !== 1 || !["ADMIN", "FUNCIONARIO"].includes(a.perfil) || a.perfil === "FUNCIONARIO" && Number(a.ativo_legado) !== 0 || !await bcrypt.compare(senha, a.senha_hash)) throw new ErroAcesso(401, "Usuário ou senha inválidos.");
            await regenerar(req);
            req.session.usuario = { id: Number(a.id_usuario), nome: a.nome, email: a.email, versao: Number(a.versao_sessao) };
            await salvar(req); return res.redirect(Number(a.trocar_senha) === 1 ? "/minha-senha" : "/painel");
        } catch (erro) {
            if (erro instanceof ErroAcesso) return res.status(erro.status).render("login", { csrf: csrf(req), erro: erro.message });
            return responderFalha(req, res, erro);
        }
    }
    function senha(req, res) { return res.render("minha-senha", { csrf: csrf(req), erro: "" }); }
    async function definirSenha(req, res) {
        try {
            conferirCsrf(req);
            if (req.body.nova !== req.body.confirmacao) throw new ErroAcesso(400, "A confirmação da nova senha não confere.");
            const a = await trocarSenha(db, req.acessoAtual.id_usuario, req.body.atual, req.body.nova);
            await regenerar(req); req.session.usuario = { id: Number(a.id_usuario), nome: a.nome, email: a.email, versao: Number(a.versao_sessao) };
            await salvar(req); return res.redirect("/painel");
        } catch (erro) {
            if (erro instanceof ErroAcesso) return res.status(erro.status).render("minha-senha", { csrf: csrf(req), erro: erro.message });
            return responderFalha(req, res, erro);
        }
    }
    async function equipe(req, res) {
        try { return res.render("equipe-cotas", { funcionarios: await servico.funcionarios(), historico: await servico.historico(req.acessoAtual.id_usuario, true), csrf: csrf(req), idOperacao: crypto.randomUUID(), sucesso: req.query.sucesso === "1", senhaAlterada: req.query.senha === "alterada" }); }
        catch (erro) { return responderFalha(req, res, erro); }
    }
    async function senhaFuncionario(req, res) {
        try { return res.render("funcionario-senha", { funcionario: await carregarFuncionario(db, req.params.id), csrf: csrf(req), erro: "" }); }
        catch (erro) { return responderFalha(req, res, erro); }
    }
    async function definirSenhaFuncionario(req, res) {
        try {
            if (req.body.nova !== req.body.confirmacao) throw new ErroAcesso(400, "A confirmação da nova senha não confere.");
            await trocarSenhaFuncionario(db, req.acessoAtual.id_usuario, req.params.id, req.body.senhaAdministrador, req.body.nova, req.body.versao);
            return res.redirect(303, "/equipe?senha=alterada#disponivel-funcionario");
        } catch (erro) {
            if (erro instanceof ErroAcesso && [400, 409].includes(erro.status)) {
                try { return res.status(erro.status).render("funcionario-senha", { funcionario: await carregarFuncionario(db, req.params.id), csrf: csrf(req), erro: erro.message }); }
                catch (falha) { return responderFalha(req, res, falha); }
            }
            return responderFalha(req, res, erro);
        }
    }
    async function minhaCota(req, res) {
        try { return res.render("minha-cota", { historico: await servico.historico(req.acessoAtual.id_usuario) }); }
        catch (erro) { return responderFalha(req, res, erro); }
    }
    async function lancamento(req, res) {
        try {
            const [estudantes] = await db.execute(`SELECT a.id_aluno AS id, a.nome, t.nome_turma AS turma FROM aluno a INNER JOIN turma t ON t.id_turma = a.id_turma ORDER BY a.nome, a.id_aluno`);
            return res.render("lancamento-lrcash", { estudantes, csrf: csrf(req), idOperacao: crypto.randomUUID() });
        } catch (erro) { return responderFalha(req, res, erro); }
    }
    async function distribuir(req, res) {
        try { return res.json({ recibo: await servico.distribuir(req.body, req.acessoAtual.id_usuario) }); }
        catch (erro) { return responderFalha(req, res, erro); }
    }
    async function liberar(req, res) {
        try { return res.json({ recibo: await servico.liberar(req.body, req.acessoAtual.id_usuario) }); }
        catch (erro) { return responderFalha(req, res, erro); }
    }
    async function recibo(req, res) {
        try { return res.json({ recibo: await servico.consultar(req.params.origem, req.params.id, req.acessoAtual.id_usuario) }); }
        catch (erro) { return responderFalha(req, res, erro); }
    }
    return { login, autenticar, senha, definirSenha, equipe, senhaFuncionario, definirSenhaFuncionario, minhaCota, lancamento, distribuir, liberar, recibo };
}
module.exports = { criarControllerAcessos };
