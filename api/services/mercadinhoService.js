"use strict";

const crypto = require("crypto");
const { calcularItens } = require("../../public/js/mercadinho-itens");
const { carregarAcesso, operavel, registrarCotaCaixa } = require("./acessoFuncionarioService");

const CRITERIOS = Object.freeze({
    SAIDA: "Compra no Armazém do Formigueiro",
    ENTRADA: "Crédito no Armazém do Formigueiro"
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_VALOR = 99999999; // Centavos: no máximo 999.999,99 por operação.

class ErroCaixa extends Error {
    constructor(status, mensagem, detalhes = {}) {
        super(mensagem);
        this.status = status;
        this.detalhes = detalhes;
    }
}

function centavos(valor, permitirZero = false) {
    const texto = String(valor ?? "").trim();
    if (!/^\d{1,12}([.,]\d{1,2})?$/.test(texto)) {
        throw new ErroCaixa(400, "Digite um valor válido, com até duas casas decimais.");
    }
    const [inteiro, fracao = ""] = texto.replace(",", ".").split(".");
    const resultado = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
    if (!Number.isSafeInteger(resultado) || resultado < (permitirZero ? 0 : 1)) {
        throw new ErroCaixa(400, "O valor deve ser maior que zero.");
    }
    return resultado;
}

function decimal(valor) {
    if (!Number.isSafeInteger(valor) || valor < 0) throw new Error("Saldo inválido.");
    return `${Math.floor(valor / 100)}.${String(valor % 100).padStart(2, "0")}`;
}

function normalizarCodigo(entrada) {
    let codigo = String(entrada ?? "").trim();
    if (!codigo || codigo.length > 2048) throw new ErroCaixa(400, "Leia o QR Code ou digite o código do aluno.");
    if (/^https?:\/\//i.test(codigo)) {
        let url;
        try { url = new URL(codigo); } catch { throw new ErroCaixa(400, "QR Code inválido."); }
        codigo = url.pathname;
    }
    if (codigo.startsWith("/q/")) {
        const match = /^\/q\/([^/]+)\/?$/.exec(codigo);
        try { codigo = match ? decodeURIComponent(match[1]) : ""; } catch { codigo = ""; }
    }
    if (/^[a-z0-9]{6}$/i.test(codigo)) return { tipo: "curto", valor: codigo.toUpperCase() };
    if (/^(?:[a-f0-9]{32}|[a-f0-9]{48}|[a-f0-9]{64}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i.test(codigo)) {
        return { tipo: "qr", valor: codigo.toLowerCase() };
    }
    throw new ErroCaixa(400, "Use o QR Code FolhaPay ou o código de acesso com 6 caracteres.");
}

function assinarIdentificacao(aluno, usuarioId, segredo, agora = Date.now()) {
    const dados = Buffer.from(JSON.stringify({
        aluno: Number(aluno.id_aluno), conta: Number(aluno.id_conta),
        usuario: Number(usuarioId), expira: agora + 30 * 60 * 1000
    })).toString("base64url");
    const assinatura = crypto.createHmac("sha256", segredo).update(dados).digest("base64url");
    return `${dados}.${assinatura}`;
}

function verificarIdentificacao(token, usuarioId, segredo, agora = Date.now()) {
    try {
        const [dados, assinatura, extra] = String(token || "").split(".");
        if (extra !== undefined || !dados || !assinatura || !segredo) throw new Error();
        const esperada = crypto.createHmac("sha256", segredo).update(dados).digest();
        const recebida = Buffer.from(assinatura, "base64url");
        if (recebida.length !== esperada.length || !crypto.timingSafeEqual(recebida, esperada)) throw new Error();
        const valor = JSON.parse(Buffer.from(dados, "base64url").toString("utf8"));
        if (valor.usuario !== Number(usuarioId) || !Number.isSafeInteger(valor.aluno) || valor.aluno <= 0 ||
            !Number.isSafeInteger(valor.conta) || valor.conta <= 0 || !Number.isSafeInteger(valor.expira) || valor.expira <= agora) throw new Error();
        return valor;
    } catch {
        throw new ErroCaixa(409, "A identificação expirou. Leia o cartão novamente antes de uma nova operação.");
    }
}

function validarOperacao(body) {
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.id_operacao !== "string" || !UUID.test(body.id_operacao)) {
        throw new ErroCaixa(400, "Identificador da operação inválido. Atualize a página.");
    }
    if (body.tipo !== "SAIDA" && body.tipo !== "ENTRADA") throw new ErroCaixa(400, "Escolha compra ou crédito.");
    let calculo = null;
    if (body.itens !== undefined) {
        if (body.tipo !== "SAIDA") throw new ErroCaixa(400, "Os itens devem ser enviados em uma compra.");
        try { calculo = calcularItens(body.itens); }
        catch (erro) { throw new ErroCaixa(400, erro.message); }
    }
    const valor = centavos(body.valor);
    if (valor > MAX_VALOR) throw new ErroCaixa(400, "O valor máximo por operação é 999.999,99 LRCash.");
    const descricao = String(body.descricao || "").trim();
    if (calculo && (valor !== calculo.centavos || descricao !== calculo.descricao)) {
        throw new ErroCaixa(400, "O total ou a descrição não correspondem aos itens. Confira a compra novamente.");
    }
    if (descricao.length < 3 || descricao.length > 200 || /[\u0000-\u001f\u007f]/.test(descricao)) {
        throw new ErroCaixa(400, "Descreva os itens ou o motivo do crédito usando de 3 a 200 caracteres.");
    }
    const identificacao = String(body.identificacao || "");
    if (identificacao.length < 10 || identificacao.length > 512) throw new ErroCaixa(400, "Identifique o aluno primeiro.");
    const saldoEsperado = centavos(body.saldo_esperado, true);
    const dados = { id: body.id_operacao.toLowerCase(), tipo: body.tipo, valor, descricao, identificacao, saldoEsperado };
    // Conserva a assinatura das operações antigas para recuperar pendências da versão anterior.
    const assinatura = [
        dados.identificacao, dados.tipo, dados.valor, dados.descricao, dados.saldoEsperado
    ];
    if (calculo) assinatura.push(calculo.itens);
    dados.hash = crypto.createHash("sha256").update(JSON.stringify(assinatura)).digest("hex");
    return dados;
}

function criarServico(db) {
    async function consultarAluno(condicao, parametros, naoEncontrado = "Aluno não encontrado. Confira o cartão ou o código.") {
        const [alunos] = await db.execute(`
            SELECT a.id_aluno, a.nome, t.nome_turma AS turma,
                   c.id_conta, c.saldo, c.status
            FROM aluno a
            JOIN turma t ON t.id_turma = a.id_turma
            JOIN conta c ON c.id_aluno = a.id_aluno
            WHERE ${condicao}
            LIMIT 2
        `, parametros);
        if (!alunos.length) throw new ErroCaixa(404, naoEncontrado);
        if (alunos.length !== 1) throw new ErroCaixa(409, "A identificação corresponde a mais de uma conta. Confira o cadastro.");
        if (Number(alunos[0].status) !== 1) throw new ErroCaixa(409, "A conta deste aluno está inativa.");
        alunos[0].saldo = decimal(centavos(alunos[0].saldo, true));
        return alunos[0];
    }
    async function buscarAluno(codigoBruto) {
        const codigo = normalizarCodigo(codigoBruto);
        // A pesquisa curta também aceita o prefixo do QR, mas recusa colisões.
        const condicao = codigo.tipo === "curto"
            ? "(UPPER(a.codigo_acesso) = ? OR UPPER(LEFT(a.qr_code, 6)) = ?)"
            : "a.qr_code = ?";
        const parametros = codigo.tipo === "curto" ? [codigo.valor, codigo.valor] : [codigo.valor];
        return consultarAluno(condicao, parametros);
    }

    async function buscarAlunoPorId(valor) {
        if (!["string", "number"].includes(typeof valor) || !/^[1-9]\d*$/.test(String(valor)) || !Number.isSafeInteger(Number(valor))) {
            throw new ErroCaixa(400, "Selecione um estudante válido na pesquisa.");
        }
        return consultarAluno("a.id_aluno = ?", [Number(valor)], "Este estudante não possui uma conta disponível para o caixa.");
    }

    async function carregarRecibo(executor, id, usuarioId) {
        const [rows] = await executor.execute(`
            SELECT o.id_operacao, o.id_usuario, o.requisicao_hash, o.id_movimentacao,
                   o.tipo, o.valor, o.saldo_anterior, o.saldo_posterior, o.descricao,
                   o.criado_em, a.nome, t.nome_turma AS turma
            FROM mercadinho_operacao o
            JOIN aluno a ON a.id_aluno = o.id_aluno
            JOIN turma t ON t.id_turma = a.id_turma
            WHERE o.id_operacao = ? AND o.id_usuario = ?
            LIMIT 1
        `, [id, usuarioId]);
        return rows[0] || null;
    }

    function reciboPublico(row, repetida) {
        return {
            id_operacao: row.id_operacao, id_movimentacao: row.id_movimentacao,
            tipo: row.tipo, valor: decimal(centavos(row.valor)),
            saldo_anterior: decimal(centavos(row.saldo_anterior, true)),
            saldo_posterior: decimal(centavos(row.saldo_posterior, true)),
            descricao: row.descricao, nome: row.nome, turma: row.turma,
            data: row.criado_em, repetida
        };
    }

    async function registrar(body, usuarioId, segredo) {
        const op = validarOperacao(body);
        let connection;
        let transacao = false;
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();
            transacao = true;
            // A chave primária reserva a operação. Pedidos simultâneos com a mesma
            // chave aguardam o primeiro commit e não geram um segundo lançamento.
            try {
                await connection.execute(`
                    INSERT INTO mercadinho_operacao
                        (id_operacao, id_usuario, requisicao_hash)
                    VALUES (?, ?, ?)
                `, [op.id, usuarioId, op.hash]);
            } catch (erro) {
                if (erro.code !== "ER_DUP_ENTRY") throw erro;
                await connection.rollback();
                transacao = false;
                const existente = await carregarRecibo(connection, op.id, usuarioId);
                if (!existente || existente.requisicao_hash !== op.hash || !existente.id_movimentacao) {
                    throw new ErroCaixa(409, "Esta operação já foi utilizada com outros dados. Confira o extrato antes de continuar.");
                }
                return reciboPublico(existente, true);
            }
            const identidade = verificarIdentificacao(op.identificacao, usuarioId, segredo);
            // Trava o operador antes da conta do aluno, na mesma ordem do crédito em aula.
            const acesso = await carregarAcesso(connection, usuarioId, true);
            operavel(acesso);
            const [contas] = await connection.execute(`
                SELECT id_conta, id_aluno, saldo, status FROM conta
                WHERE id_conta = ? AND id_aluno = ? FOR UPDATE
            `, [identidade.conta, identidade.aluno]);
            if (contas.length !== 1 || Number(contas[0].status) !== 1) {
                throw new ErroCaixa(409, "Conta não encontrada ou inativa. Leia o cartão novamente.");
            }
            const saldoAnterior = centavos(contas[0].saldo, true);
            if (saldoAnterior !== op.saldoEsperado) {
                throw new ErroCaixa(409, "O saldo mudou. Confira o saldo atualizado e confirme novamente.", { saldo: decimal(saldoAnterior) });
            }
            if (op.tipo === "SAIDA" && op.valor > saldoAnterior) {
                throw new ErroCaixa(409, "Saldo insuficiente para esta compra.", { saldo: decimal(saldoAnterior) });
            }
            const [criterios] = await connection.execute(`
                SELECT id_criterio FROM criterio
                WHERE nome_criterio = ? AND ativo = TRUE LIMIT 2
            `, [CRITERIOS[op.tipo]]);
            if (criterios.length !== 1) throw new ErroCaixa(503, "O caixa precisa concluir sua preparação no banco. Avise a responsável pelo sistema.");
            const novoSaldo = saldoAnterior + (op.tipo === "ENTRADA" ? op.valor : -op.valor);
            const [movimento] = await connection.execute(`
                INSERT INTO movimentacao
                    (valor, tipo, data_hora, descricao_observacao, id_conta, id_criterio)
                VALUES (?, ?, NOW(), ?, ?, ?)
            `, [decimal(op.valor), op.tipo, op.descricao, identidade.conta, criterios[0].id_criterio]);
            if (op.tipo === "ENTRADA") await registrarCotaCaixa(connection, acesso, op, movimento.insertId, identidade);
            const [contaAtualizada] = await connection.execute(`
                UPDATE conta SET saldo = ? WHERE id_conta = ? AND id_aluno = ? AND status = TRUE
            `, [decimal(novoSaldo), identidade.conta, identidade.aluno]);
            if (contaAtualizada.affectedRows !== 1) throw new Error("ACCOUNT_UPDATE_FAILED");
            await connection.execute(`
                UPDATE mercadinho_operacao SET
                    id_conta = ?, id_aluno = ?, id_movimentacao = ?, tipo = ?, valor = ?,
                    saldo_anterior = ?, saldo_posterior = ?, descricao = ?
                WHERE id_operacao = ?
            `, [identidade.conta, identidade.aluno, movimento.insertId, op.tipo, decimal(op.valor),
                decimal(saldoAnterior), decimal(novoSaldo), op.descricao, op.id]);
            // Leia o recibo antes do commit. Uma falha aqui ainda pode desfazer tudo.
            const row = await carregarRecibo(connection, op.id, usuarioId);
            if (!row) throw new Error("RECEIPT_NOT_FOUND");
            await connection.commit();
            transacao = false;
            return reciboPublico(row, false);
        } catch (erro) {
            if (connection && transacao) await connection.rollback().catch(() => {});
            throw erro;
        } finally {
            if (connection) connection.release();
        }
    }

    async function consultarRecibo(id, usuarioId) {
        if (!UUID.test(String(id || ""))) throw new ErroCaixa(400, "Operação inválida.");
        const row = await carregarRecibo(db, id.toLowerCase(), usuarioId);
        return row ? reciboPublico(row, true) : null;
    }
    return { buscarAluno, buscarAlunoPorId, registrar, consultarRecibo };
}

module.exports = { criarServico, ErroCaixa, centavos, decimal, normalizarCodigo,
    assinarIdentificacao, verificarIdentificacao, validarOperacao, CRITERIOS };
