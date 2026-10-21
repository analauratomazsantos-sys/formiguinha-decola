"use strict";
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");

class ErroAcesso extends Error {
    constructor(status, message, detalhes = {}) { super(message); this.status = status; this.detalhes = detalhes; }
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function idValido(valor) {
    if (!["string", "number"].includes(typeof valor) || !/^[1-9]\d*$/.test(String(valor)) || !Number.isSafeInteger(Number(valor))) throw new ErroAcesso(400, "Escolha um cadastro válido.");
    return Number(valor);
}
function centavos(valor, zero = false) {
    if (!["string", "number"].includes(typeof valor) || !/^\d{1,13}([.,]\d{1,2})?$/.test(String(valor))) throw new ErroAcesso(400, "Informe um valor com até duas casas decimais.");
    const [inteiro, fracao = ""] = String(valor).replace(",", ".").split(".");
    const total = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
    if (!Number.isSafeInteger(total) || total < (zero ? 0 : 1)) throw new ErroAcesso(400, "O valor deve ser maior que zero.");
    return total;
}
function decimal(total) {
    if (!Number.isSafeInteger(total) || total < 0) throw new Error("INVALID_CURRENCY");
    return `${Math.floor(total / 100)}.${String(total % 100).padStart(2, "0")}`;
}
const CAMPOS_ACESSO = `u.id_usuario, u.nome, u.email,
    CASE WHEN a.perfil = 'FUNCIONARIO' THEN a.habilitado ELSE u.ativo END AS ativo,
    u.ativo AS ativo_legado, a.perfil, a.habilitado,
    a.cargos, a.trocar_senha, a.versao_sessao, a.saldo_cota`;
async function carregarAcesso(db, id, travar = false) {
    const [rows] = await db.execute(`SELECT ${CAMPOS_ACESSO} FROM usuario u
        INNER JOIN usuario_acesso a ON a.id_usuario = u.id_usuario
        WHERE u.id_usuario = ?${travar ? " FOR UPDATE" : ""}`, [idValido(id)]);
    const acesso = rows[0];
    if (rows.length !== 1 || Number(acesso.ativo) !== 1 || !["ADMIN", "FUNCIONARIO"].includes(acesso.perfil) || acesso.perfil === "FUNCIONARIO" && Number(acesso.ativo_legado) !== 0) throw new ErroAcesso(401, "Seu acesso está inativo ou terminou. Entre novamente.");
    return acesso;
}
function operavel(acesso) {
    if (Number(acesso.trocar_senha) === 1) throw new ErroAcesso(403, "Defina sua senha pessoal antes de continuar.");
}
function administrador(acesso) {
    operavel(acesso);
    if (acesso.perfil !== "ADMIN") throw new ErroAcesso(403, "Esta ação é exclusiva da administração.");
}
function csrf(req) {
    if (!req.session.acessosCsrf) req.session.acessosCsrf = crypto.randomBytes(32).toString("hex");
    return req.session.acessosCsrf;
}
function conferirCsrf(req) {
    const recebido = req.get("X-CSRF-Token") || req.body?._csrf, esperado = req.session?.acessosCsrf;
    if (typeof recebido !== "string" || typeof esperado !== "string" || !/^[a-f0-9]{64}$/.test(recebido) || recebido.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado))) throw new ErroAcesso(403, "Atualize a página antes de continuar.");
}
const publico = a => ({ id: Number(a.id_usuario), nome: a.nome, email: a.email, perfil: a.perfil, codigo_acesso: a.codigo_acesso,
    cargos: a.cargos, trocar_senha: Number(a.trocar_senha) === 1, versao: Number(a.versao_sessao), saldo_cota: decimal(centavos(a.saldo_cota, true)) });
async function consumirCota(db, acesso, valor) {
    operavel(acesso);
    if (acesso.perfil === "ADMIN") return { anterior: null, posterior: null };
    const anterior = centavos(acesso.saldo_cota, true);
    if (valor > anterior) throw new ErroAcesso(409, `Sua cota disponível é ${decimal(anterior).replace(".", ",")} LRCash. Peça uma liberação à administração.`, { cota: decimal(anterior) });
    const posterior = anterior - valor;
    const [resultado] = await db.execute(`UPDATE usuario_acesso SET saldo_cota = ? WHERE id_usuario = ? AND perfil = 'FUNCIONARIO' AND saldo_cota = ?`,
        [decimal(posterior), acesso.id_usuario, decimal(anterior)]);
    if (resultado.affectedRows !== 1) throw new Error("QUOTA_UPDATE_FAILED");
    return { anterior: decimal(anterior), posterior: decimal(posterior) };
}
async function registrarCotaCaixa(db, acesso, op, movimento, aluno) {
    const cota = await consumirCota(db, acesso, op.valor);
    await db.execute(`INSERT INTO cota_operacao
        (origem, id_operacao, id_operador, requisicao_hash, id_funcionario, valor, cota_anterior, cota_posterior, id_aluno, id_conta, id_movimentacao, observacao)
        VALUES ('CAIXA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [op.id, acesso.id_usuario, op.hash, acesso.perfil === "FUNCIONARIO" ? acesso.id_usuario : null, decimal(op.valor), cota.anterior, cota.posterior,
            aluno.aluno, aluno.conta, movimento, op.descricao]);
}
function validarNovaSenha(senha) {
    if (typeof senha !== "string" || Array.from(senha).length < 4 || Buffer.byteLength(senha, "utf8") > 72 || /\u0000/.test(senha)) throw new ErroAcesso(400, "Use uma senha de pelo menos 4 caracteres, com no máximo 72 bytes. Você pode usar uma frase.");
}
async function trocarSenha(db, id, atual, nova) {
    validarNovaSenha(nova);
    if (typeof atual !== "string" || !atual || Buffer.byteLength(atual, "utf8") > 72 || atual === nova) throw new ErroAcesso(400, "Informe a senha atual e escolha uma senha pessoal diferente.");
    const connection = await db.getConnection(); let transacao = false;
    try {
        await connection.beginTransaction(); transacao = true;
        const acesso = await carregarAcesso(connection, id, true);
        const [[u]] = await connection.execute("SELECT senha_hash FROM usuario WHERE id_usuario = ?", [id]);
        if (!u || !await bcrypt.compare(atual, u.senha_hash)) throw new ErroAcesso(400, "A senha atual não confere.");
        const hash = await bcrypt.hash(nova, 12);
        await connection.execute("UPDATE usuario SET senha_hash = ? WHERE id_usuario = ?", [hash, id]);
        await connection.execute("UPDATE usuario_acesso SET trocar_senha = 0, versao_sessao = versao_sessao + 1 WHERE id_usuario = ?", [id]);
        await connection.commit(); transacao = false;
        return { ...acesso, trocar_senha: 0, versao_sessao: Number(acesso.versao_sessao) + 1 };
    } catch (erro) { if (transacao) await connection.rollback().catch(() => {}); throw erro; }
    finally { connection.release(); }
}
async function carregarFuncionario(db, id, travar = false) {
    let funcionario;
    try { funcionario = await carregarAcesso(db, id, travar); }
    catch (erro) {
        if (erro instanceof ErroAcesso && erro.status === 401) throw new ErroAcesso(404, "Funcionário não encontrado ou inativo.");
        throw erro;
    }
    if (funcionario.perfil !== "FUNCIONARIO") throw new ErroAcesso(404, "Escolha um funcionário da equipe.");
    return funcionario;
}
async function trocarSenhaFuncionario(db, administradorId, funcionarioId, senhaAdministrador, nova, versao) {
    const operador = idValido(administradorId), destino = idValido(funcionarioId), versaoEsperada = idValido(versao);
    validarNovaSenha(nova);
    if (operador === destino) throw new ErroAcesso(400, "Para alterar sua própria senha, use Alterar minha senha no painel.");
    if (typeof senhaAdministrador !== "string" || !senhaAdministrador || Buffer.byteLength(senhaAdministrador, "utf8") > 72) throw new ErroAcesso(400, "Informe sua senha de administração para confirmar.");
    const connection = await db.getConnection(); let transacao = false;
    try {
        await connection.beginTransaction(); transacao = true;
        const acesso = await carregarAcesso(connection, operador, true); administrador(acesso);
        const [[usuario]] = await connection.execute("SELECT senha_hash FROM usuario WHERE id_usuario = ?", [operador]);
        if (!usuario || !await bcrypt.compare(senhaAdministrador, usuario.senha_hash)) throw new ErroAcesso(400, "Sua senha de administração não confere.");
        // Confere o perfil antes do bloqueio e novamente com o registro bloqueado.
        await carregarFuncionario(connection, destino);
        const funcionario = await carregarFuncionario(connection, destino, true);
        if (Number(funcionario.versao_sessao) !== versaoEsperada) throw new ErroAcesso(409, "O acesso deste funcionário foi atualizado. Confira os dados e tente novamente.");
        const hash = await bcrypt.hash(nova, 12);
        const [senha] = await connection.execute("UPDATE usuario SET senha_hash = ? WHERE id_usuario = ?", [hash, destino]);
        if (senha.affectedRows !== 1) throw new Error("PASSWORD_UPDATE_FAILED");
        const [perfil] = await connection.execute(`UPDATE usuario_acesso SET trocar_senha = 1, versao_sessao = versao_sessao + 1
            WHERE id_usuario = ? AND perfil = 'FUNCIONARIO' AND habilitado = 1 AND versao_sessao = ?`, [destino, versaoEsperada]);
        if (perfil.affectedRows !== 1) throw new Error("PASSWORD_ACCESS_UPDATE_FAILED");
        await connection.commit(); transacao = false;
        return { id: destino, nome: funcionario.nome };
    } catch (erro) { if (transacao) await connection.rollback().catch(() => {}); throw erro; }
    finally { connection.release(); }
}
module.exports = { ErroAcesso, UUID, CAMPOS_ACESSO, idValido, centavos, decimal, carregarAcesso, operavel, administrador,
    csrf, conferirCsrf, publico, consumirCota, registrarCotaCaixa, validarNovaSenha, trocarSenha, carregarFuncionario, trocarSenhaFuncionario };
