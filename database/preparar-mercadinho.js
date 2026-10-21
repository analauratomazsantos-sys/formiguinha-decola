"use strict";

// Sem --aplicar: somente leitura, prévia e diagnóstico sem dados de alunos.
// Com --aplicar: cria UMA tabela de recibos e, se necessário, DOIS critérios.
// CREATE TABLE é DDL e tem commit próprio no MySQL. Os INSERTs de critérios
// são feitos em uma transação separada. Contas e movimentos não são alterados.
const { CRITERIOS } = require("../api/services/mercadinhoService");

const COLUNAS_RECIBO = ["id_operacao", "id_usuario", "requisicao_hash", "id_conta", "id_aluno", "id_movimentacao",
    "tipo", "valor", "saldo_anterior", "saldo_posterior", "descricao", "criado_em"];

const CRIAR_RECIBOS = `CREATE TABLE IF NOT EXISTS mercadinho_operacao (
    id_operacao CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_usuario BIGINT UNSIGNED NOT NULL,
    requisicao_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_conta BIGINT UNSIGNED NULL,
    id_aluno BIGINT UNSIGNED NULL,
    id_movimentacao BIGINT UNSIGNED NULL,
    tipo VARCHAR(8) NULL,
    valor DECIMAL(15,2) NULL,
    saldo_anterior DECIMAL(15,2) NULL,
    saldo_posterior DECIMAL(15,2) NULL,
    descricao VARCHAR(200) NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_operacao),
    UNIQUE KEY uq_mercadinho_movimento (id_movimentacao),
    KEY idx_mercadinho_conta_data (id_conta, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

async function totais(db) {
    const [[linha]] = await db.execute(`
        SELECT (SELECT COUNT(*) FROM conta) AS contas,
               (SELECT COUNT(*) FROM movimentacao) AS movimentacoes,
               (SELECT COALESCE(SUM(saldo), 0) FROM conta) AS saldo_total
    `);
    return linha;
}

function dadosCriterio(colunas, nome, tipo) {
    const conhecidos = {
        nome_criterio: nome, ativo: 1,
        descricao: tipo === "SAIDA" ? "Compra registrada no caixa do Armazém do Formigueiro."
            : "Crédito manual autorizado ou devolução no caixa do Armazém do Formigueiro.",
        valor_padrao: "0.00", valor_base: "0.00", tipo
    };
    const dados = { nome_criterio: nome, ativo: 1 };
    for (const coluna of colunas) {
        if (coluna.EXTRA?.includes("GENERATED") || coluna.EXTRA?.includes("auto_increment")) continue;
        const obrigatoria = coluna.IS_NULLABLE === "NO" && coluna.COLUMN_DEFAULT === null;
        if (obrigatoria && !(coluna.COLUMN_NAME in dados)) {
            if (!(coluna.COLUMN_NAME in conhecidos)) {
                throw new Error(`A coluna obrigatória criterio.${coluna.COLUMN_NAME} precisa ser conferida antes da preparação. Nenhum saldo foi alterado.`);
            }
            dados[coluna.COLUMN_NAME] = conhecidos[coluna.COLUMN_NAME];
        }
    }
    return dados;
}

async function inspecionar(db) {
    const [tabelas] = await db.execute(`
        SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('aluno','turma','conta','movimentacao','criterio','usuario','mercadinho_operacao')
    `);
    for (const nome of ["aluno", "turma", "conta", "movimentacao", "criterio", "usuario"]) {
        if (!tabelas.some(t => t.TABLE_NAME === nome)) throw new Error(`Tabela obrigatória ausente: ${nome}.`);
    }
    for (const nome of ["conta", "movimentacao", "criterio", "mercadinho_operacao"]) {
        const tabela = tabelas.find(t => t.TABLE_NAME === nome);
        if (tabela && String(tabela.ENGINE).toUpperCase() !== "INNODB") {
            throw new Error(`A tabela ${nome} precisa usar InnoDB para garantir transações. Preparação interrompida.`);
        }
    }
    const [colunas] = await db.execute(`
        SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, EXTRA,
               COLUMN_TYPE, CHARACTER_MAXIMUM_LENGTH
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('criterio','movimentacao','mercadinho_operacao')
        ORDER BY ORDINAL_POSITION
    `);
    const criterioColunas = colunas.filter(c => c.TABLE_NAME === "criterio");
    for (const campo of ["id_criterio", "nome_criterio", "ativo"]) {
        if (!criterioColunas.some(c => c.COLUMN_NAME === campo)) throw new Error(`Campo ausente em criterio: ${campo}.`);
    }
    const nomeColuna = criterioColunas.find(c => c.COLUMN_NAME === "nome_criterio");
    if (nomeColuna.CHARACTER_MAXIMUM_LENGTH !== null && Number(nomeColuna.CHARACTER_MAXIMUM_LENGTH) < Math.max(...Object.values(CRITERIOS).map(nome => nome.length))) {
        throw new Error("A coluna nome_criterio é curta demais. Confira o esquema antes de continuar.");
    }
    const tipo = colunas.find(c => c.TABLE_NAME === "movimentacao" && c.COLUMN_NAME === "tipo");
    if (!tipo || (/^enum/i.test(tipo.COLUMN_TYPE) && (!tipo.COLUMN_TYPE.includes("'ENTRADA'") || !tipo.COLUMN_TYPE.includes("'SAIDA'")))) {
        throw new Error("O campo movimentacao.tipo precisa aceitar ENTRADA e SAIDA.");
    }
    const observacao = colunas.find(c => c.TABLE_NAME === "movimentacao" && c.COLUMN_NAME === "descricao_observacao");
    if (!observacao || (observacao.CHARACTER_MAXIMUM_LENGTH !== null && Number(observacao.CHARACTER_MAXIMUM_LENGTH) < 200)) {
        throw new Error("O campo descricao_observacao precisa comportar 200 caracteres.");
    }
    const temRecibos = tabelas.some(t => t.TABLE_NAME === "mercadinho_operacao");
    if (temRecibos) {
        for (const nome of COLUNAS_RECIBO) {
            if (!colunas.some(c => c.TABLE_NAME === "mercadinho_operacao" && c.COLUMN_NAME === nome)) {
                throw new Error(`A tabela mercadinho_operacao já existe com estrutura diferente: falta ${nome}.`);
            }
        }
        const [indices] = await db.execute(`SHOW INDEX FROM mercadinho_operacao`);
        const chave = indices.filter(i => i.Key_name === "PRIMARY");
        if (chave.length !== 1 || chave[0].Column_name !== "id_operacao") {
            throw new Error("A chave primária de mercadinho_operacao não garante a proteção contra duplicação.");
        }
    }
    const criterios = [];
    for (const [tipo, nome] of Object.entries(CRITERIOS)) {
        const [existentes] = await db.execute("SELECT id_criterio, nome_criterio, ativo FROM criterio WHERE nome_criterio = ? LIMIT 2", [nome]);
        if (existentes.length > 1) throw new Error(`Critério duplicado: ${nome}. Corrija o conflito antes de preparar o caixa.`);
        if (existentes.length && Number(existentes[0].ativo) !== 1) throw new Error(`O critério ${nome} está inativo. Nenhuma reativação será feita automaticamente.`);
        criterios.push({ nome, existente: existentes[0] || null,
            dados: existentes.length ? null : dadosCriterio(criterioColunas, nome, tipo) });
    }
    return { temRecibos, criterios, totais: await totais(db) };
}

async function preparar(db, aplicar, log = console.log) {
    const previa = await inspecionar(db);
    log("PRÉVIA DO CAIXA DO MERCADINHO");
    log(JSON.stringify(previa.totais));
    log(`Tabela de recibos: ${previa.temRecibos ? "já existe; será preservada" : "será criada, inicialmente vazia"}.`);
    for (const c of previa.criterios) log(`${c.nome}: ${c.existente ? "já existe; será preservado" : "será criado como novo critério"}.`);
    log("Registros atuais de alunos, contas e movimentações a alterar: 0.");
    if (!aplicar) {
        log("MODO PRÉVIA: nenhuma alteração foi feita.");
        log("Depois da conferência e confirmação: node .\\database\\preparar-mercadinho.js --aplicar");
        return previa;
    }
    const connection = await db.getConnection();
    let lock = false;
    let transacao = false;
    try {
        const [[travamento]] = await connection.execute("SELECT GET_LOCK('formiguinha_mercadinho_preparacao_v1', 10) AS obtido");
        if (Number(travamento.obtido) !== 1) throw new Error("Outra preparação está em andamento. Tente novamente depois.");
        lock = true;
        // Repita as verificações após obter o lock, antes de qualquer escrita.
        const atual = await inspecionar(connection);
        if (!atual.temRecibos) await connection.query(CRIAR_RECIBOS);
        await connection.beginTransaction();
        transacao = true;
        for (const c of atual.criterios) {
            if (c.existente) continue;
            const campos = Object.keys(c.dados);
            const sql = `INSERT INTO criterio (${campos.map(nome => `\`${nome}\``).join(", ")}) VALUES (${campos.map(() => "?").join(", ")})`;
            await connection.execute(sql, campos.map(nome => c.dados[nome]));
        }
        await connection.commit();
        transacao = false;
        const validacao = await inspecionar(connection);
        log("Preparação concluída. Nenhum saldo ou extrato existente foi modificado pelo script.");
        log(`Totais após a preparação: ${JSON.stringify(validacao.totais)}`);
        log("O caixa está pronto para o teste local autenticado.");
        return validacao;
    } catch (erro) {
        if (transacao) await connection.rollback().catch(() => {});
        throw erro;
    } finally {
        if (lock) await connection.execute("SELECT RELEASE_LOCK('formiguinha_mercadinho_preparacao_v1')").catch(() => {});
        connection.release();
    }
}

if (require.main === module) {
    if (process.argv.slice(2).some(arg => arg !== "--aplicar")) {
        console.error("Use sem argumentos para prévia ou --aplicar após conferir a prévia.");
        process.exitCode = 1;
    } else {
        require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), quiet: true });
        const db = require("../api/config/database.js");
        preparar(db, process.argv.includes("--aplicar"))
            .catch(erro => {
                console.error(erro.code ? `Preparação interrompida (${erro.code}). Nenhuma credencial foi exibida.` : erro.message);
                process.exitCode = 1;
            })
            .finally(() => db.end());
    }
}

module.exports = { preparar, inspecionar, CRIAR_RECIBOS, dadosCriterio };
