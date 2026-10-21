"use strict";
const crypto = require("node:crypto");
const { ErroAcesso, UUID, idValido, centavos, decimal, carregarAcesso, operavel, administrador, consumirCota } = require("./acessoFuncionarioService");
const CRITERIOS = Object.freeze({ FREQUENCIA: "Frequência", SALA_DO_FUTURO: "Tarefa da Sala do Futuro", DISTRIBUICAO_AULA: "Distribuição em aula" });
function validar(body, origem) {
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.id_operacao !== "string" || !UUID.test(body.id_operacao)) throw new ErroAcesso(400, "Atualize a página para iniciar uma nova operação.");
    const id = body.id_operacao.toLowerCase(), valor = centavos(body.valor);
    if (valor > 99999999) throw new ErroAcesso(400, "O valor máximo por operação é 999.999,99 LRCash.");
    const observacao = typeof body.observacao === "string" ? body.observacao.trim() : "";
    if (observacao.length > 200 || /[\u0000-\u001f\u007f]/.test(observacao)) throw new ErroAcesso(400, "A observação deve ter no máximo 200 caracteres.");
    const destino = idValido(origem === "LIBERACAO" ? body.funcionarioId : body.estudanteId);
    const criterio = origem === "DISTRIBUICAO" ? body.criterio : "";
    if (origem === "DISTRIBUICAO" && (!Object.hasOwn(CRITERIOS, criterio) || typeof criterio !== "string" || body.tipo && body.tipo !== "ENTRADA")) throw new ErroAcesso(400, "Escolha um critério de crédito válido.");
    const hash = crypto.createHash("sha256").update(JSON.stringify([origem, destino, valor, criterio, observacao])).digest("hex");
    return { id, valor, observacao, destino, criterio, hash };
}
const SELECT_RECIBO = `SELECT o.*, a.nome AS nome_aluno, t.nome_turma AS turma, u.nome AS nome_funcionario, autor.nome AS nome_operador
    FROM cota_operacao o LEFT JOIN aluno a ON a.id_aluno = o.id_aluno LEFT JOIN turma t ON t.id_turma = a.id_turma
    LEFT JOIN usuario u ON u.id_usuario = o.id_funcionario LEFT JOIN usuario autor ON autor.id_usuario = o.id_operador`;
async function lerRecibo(db, origem, id, operador) {
    const [rows] = await db.execute(`${SELECT_RECIBO} WHERE o.origem = ? AND o.id_operacao = ? AND o.id_operador = ? LIMIT 1`, [origem, id, operador]);
    return rows[0] || null;
}
function recibo(row, repetida) {
    return { id_operacao: row.id_operacao, origem: row.origem, valor: decimal(centavos(row.valor)),
        nome: row.nome_aluno || row.nome_funcionario, turma: row.turma || "", cota_posterior: row.cota_posterior, repetida,
        destino: row.origem === "LIBERACAO" ? `/equipe?sucesso=1&funcionarioId=${row.id_funcionario}` : `/saldo?estudanteId=${row.id_aluno}&sucesso=1` };
}
function criarServicoCotas(db) {
    async function executar(origem, body, usuarioId) {
        const op = validar(body, origem); const connection = await db.getConnection(); let transacao = false;
        try {
            await connection.beginTransaction(); transacao = true;
            try {
                await connection.execute(`INSERT INTO cota_operacao (origem, id_operacao, id_operador, requisicao_hash, valor, observacao)
                    VALUES (?, ?, ?, ?, ?, ?)`, [origem, op.id, usuarioId, op.hash, decimal(op.valor), op.observacao]);
            } catch (erro) {
                if (erro.code !== "ER_DUP_ENTRY") throw erro;
                await connection.rollback(); transacao = false;
                const anterior = await lerRecibo(connection, origem, op.id, usuarioId);
                if (!anterior || anterior.requisicao_hash !== op.hash || origem === "DISTRIBUICAO" && !anterior.id_movimentacao || origem === "LIBERACAO" && !anterior.id_funcionario) throw new ErroAcesso(409, "Esta operação já foi utilizada com outros dados. Confira o histórico.", { conferir: true });
                return recibo(anterior, true);
            }
            const acesso = await carregarAcesso(connection, usuarioId, true); operavel(acesso);
            if (origem === "LIBERACAO") {
                administrador(acesso);
                const funcionario = await carregarAcesso(connection, op.destino, true);
                if (funcionario.perfil !== "FUNCIONARIO") throw new ErroAcesso(400, "Escolha um funcionário para receber a cota.");
                const antes = centavos(funcionario.saldo_cota, true), depois = antes + op.valor;
                if (depois > 999999999999999) throw new ErroAcesso(400, "A liberação ultrapassa o limite de saldo da cota.");
                const [atualizacao] = await connection.execute("UPDATE usuario_acesso SET saldo_cota = ? WHERE id_usuario = ? AND perfil = 'FUNCIONARIO' AND saldo_cota = ?", [decimal(depois), op.destino, decimal(antes)]);
                if (atualizacao.affectedRows !== 1) throw new Error("QUOTA_UPDATE_FAILED");
                await connection.execute(`UPDATE cota_operacao SET id_funcionario = ?, cota_anterior = ?, cota_posterior = ? WHERE origem = ? AND id_operacao = ?`, [op.destino, decimal(antes), decimal(depois), origem, op.id]);
            } else {
                const [contas] = await connection.execute(`SELECT c.id_conta, c.id_aluno, c.saldo, c.status FROM conta c
                    WHERE c.id_aluno = ? FOR UPDATE`, [op.destino]);
                if (contas.length !== 1 || Number(contas[0].status) !== 1) throw new ErroAcesso(409, "A conta do estudante não foi encontrada, está duplicada ou inativa.");
                const [criterios] = await connection.execute("SELECT id_criterio FROM criterio WHERE nome_criterio = ? AND ativo = TRUE LIMIT 2", [CRITERIOS[op.criterio]]);
                if (criterios.length !== 1) throw new ErroAcesso(503, "O critério precisa ser conferido pela administração.");
                const cota = await consumirCota(connection, acesso, op.valor);
                const saldo = decimal(centavos(contas[0].saldo, true) + op.valor);
                const [movimento] = await connection.execute(`INSERT INTO movimentacao
                    (valor, tipo, data_hora, descricao_observacao, id_conta, id_criterio) VALUES (?, 'ENTRADA', NOW(), ?, ?, ?)`,
                    [decimal(op.valor), op.observacao || "Crédito em aula", contas[0].id_conta, criterios[0].id_criterio]);
                const [resultado] = await connection.execute("UPDATE conta SET saldo = ? WHERE id_conta = ? AND id_aluno = ? AND status = TRUE", [saldo, contas[0].id_conta, op.destino]);
                if (resultado.affectedRows !== 1) throw new Error("ACCOUNT_UPDATE_FAILED");
                await connection.execute(`UPDATE cota_operacao SET id_funcionario = ?, cota_anterior = ?, cota_posterior = ?, id_aluno = ?, id_conta = ?, id_movimentacao = ? WHERE origem = ? AND id_operacao = ?`,
                    [acesso.perfil === "FUNCIONARIO" ? usuarioId : null, cota.anterior, cota.posterior, op.destino, contas[0].id_conta, movimento.insertId, origem, op.id]);
            }
            const row = await lerRecibo(connection, origem, op.id, usuarioId);
            if (!row) throw new Error("RECEIPT_NOT_FOUND");
            await connection.commit(); transacao = false; return recibo(row, false);
        } catch (erro) { if (transacao) await connection.rollback().catch(() => {}); throw erro; }
        finally { connection.release(); }
    }
    async function historico(id, admin = false) {
        const [rows] = await db.execute(`${SELECT_RECIBO}${admin ? "" : " WHERE (o.id_funcionario = ? OR o.id_operador = ?)"} ORDER BY o.criado_em DESC, o.id_operacao DESC LIMIT 100`, admin ? [] : [id, id]);
        return rows;
    }
    async function funcionarios() {
        const [rows] = await db.execute(`SELECT ${"u.id_usuario, u.nome, a.habilitado AS ativo, a.codigo_acesso, a.cargos, a.saldo_cota, a.trocar_senha"}
            FROM usuario u INNER JOIN usuario_acesso a ON a.id_usuario = u.id_usuario WHERE a.perfil = 'FUNCIONARIO' ORDER BY u.nome, u.id_usuario`);
        return rows;
    }
    async function consultar(origem, id, usuarioId) {
        if (!["DISTRIBUICAO", "LIBERACAO"].includes(origem) || !UUID.test(String(id))) throw new ErroAcesso(400, "Operação inválida.");
        const row = await lerRecibo(db, origem, id.toLowerCase(), usuarioId); return row ? recibo(row, true) : null;
    }
    return { distribuir: (body, id) => executar("DISTRIBUICAO", body, id), liberar: (body, id) => executar("LIBERACAO", body, id), historico, funcionarios, consultar };
}
module.exports = { criarServicoCotas, CRITERIOS, validar };
