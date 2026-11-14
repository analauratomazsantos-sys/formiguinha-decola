"use strict";

const crypto = require("node:crypto");
const { ErroCaixa } = require("./mercadinhoService");

function idValido(id) { return Number.isSafeInteger(id) && id > 0; }

function assinarEdicaoFoto(idAluno, idUsuario, segredo, agora = Date.now()) {
    if (!idValido(Number(idAluno)) || !idValido(Number(idUsuario)) || !segredo) {
        throw new ErroCaixa(400, "Não foi possível preparar a edição da foto.");
    }
    const dados = Buffer.from(JSON.stringify({ finalidade: "foto-aluno", aluno: Number(idAluno),
        usuario: Number(idUsuario), expira: agora + 30 * 60 * 1000 })).toString("base64url");
    const assinatura = crypto.createHmac("sha256", segredo).update(dados).digest("base64url");
    return `${dados}.${assinatura}`;
}

function verificarEdicaoFoto(token, idUsuario, segredo, agora = Date.now()) {
    try {
        if (typeof token !== "string" || token.length > 512 || !idValido(Number(idUsuario)) || !segredo) throw new Error();
        const [dados, assinatura, extra] = token.split(".");
        if (!dados || !assinatura || extra !== undefined) throw new Error();
        const esperada = crypto.createHmac("sha256", segredo).update(dados).digest();
        const recebida = Buffer.from(assinatura, "base64url");
        if (recebida.length !== esperada.length || !crypto.timingSafeEqual(recebida, esperada)) throw new Error();
        const valor = JSON.parse(Buffer.from(dados, "base64url").toString("utf8"));
        if (valor.finalidade !== "foto-aluno" || !idValido(valor.aluno) || valor.usuario !== Number(idUsuario) ||
            !Number.isSafeInteger(valor.expira) || valor.expira <= agora) throw new Error();
        return valor.aluno;
    } catch {
        throw new ErroCaixa(409, "A edição da foto expirou. Reabra a página do estudante antes de salvar.");
    }
}

module.exports = { assinarEdicaoFoto, verificarEdicaoFoto };
