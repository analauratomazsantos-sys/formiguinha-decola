"use strict";

class ErroPreparacao extends Error {}

async function previaFotos(db) {
    const [aluno] = await db.execute(`SELECT c.COLUMN_TYPE, t.ENGINE FROM information_schema.COLUMNS c
        JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
        WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = 'aluno' AND c.COLUMN_NAME = 'id_aluno'`);
    if (aluno.length !== 1 || aluno[0].ENGINE !== "InnoDB" ||
        !/^(tinyint|smallint|mediumint|int|bigint)(\(\d+\))?( unsigned)?$/i.test(aluno[0].COLUMN_TYPE)) {
        throw new ErroPreparacao("Não foi possível confirmar o identificador e o motor da tabela aluno. Nada foi alterado.");
    }
    const [tabela] = await db.execute("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'aluno_foto'");
    if (tabela.length) {
        const [colunas] = await db.execute("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'aluno_foto'");
        const normalizar = tipo => String(tipo).toLowerCase().replace(/\(\d+\)/g, "");
        const esperadas = { id_aluno: aluno[0].COLUMN_TYPE, imagem: "mediumblob", largura: "smallint unsigned",
            altura: "smallint unsigned", id_usuario: "bigint", atualizado_em: "timestamp" };
        const [indices] = await db.execute("SHOW INDEX FROM aluno_foto");
        const primaria = indices.filter(indice => indice.Key_name === "PRIMARY");
        const [chaves] = await db.execute(`SELECT k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE k WHERE k.TABLE_SCHEMA = DATABASE()
            AND k.TABLE_NAME = 'aluno_foto' AND k.REFERENCED_TABLE_NAME IS NOT NULL`);
        if (tabela[0].ENGINE !== "InnoDB" || Object.entries(esperadas).some(([nome, tipo]) => {
            const coluna = colunas.find(c => c.COLUMN_NAME === nome);
            return !coluna || normalizar(coluna.COLUMN_TYPE) !== normalizar(tipo) || coluna.IS_NULLABLE !== "NO";
        }) || colunas.some(c => !(c.COLUMN_NAME in esperadas) && c.IS_NULLABLE === "NO" &&
            c.COLUMN_DEFAULT === null && !String(c.EXTRA).includes("auto_increment")) ||
            primaria.length !== 1 || primaria[0].Column_name !== "id_aluno" ||
            !chaves.some(k => k.COLUMN_NAME === "id_aluno" && k.REFERENCED_TABLE_NAME === "aluno" && k.REFERENCED_COLUMN_NAME === "id_aluno")) {
            throw new ErroPreparacao("A tabela aluno_foto existe com estrutura diferente da esperada. Nada foi alterado.");
        }
    }
    const [totais] = await db.execute(`SELECT (SELECT COUNT(*) FROM conta) AS contas,
        (SELECT COUNT(*) FROM movimentacao) AS movimentacoes,
        (SELECT COALESCE(SUM(saldo), 0) FROM conta) AS saldo_total`);
    const [fotos] = tabela.length ? await db.execute("SELECT COUNT(*) AS quantidade FROM aluno_foto") : [[{ quantidade: 0 }]];
    return { existe: tabela.length > 0, tipoId: aluno[0].COLUMN_TYPE, fotos: Number(fotos[0].quantidade), totais: totais[0] };
}

async function prepararFotos(db, aplicar = false, log = console.log) {
    const previa = await previaFotos(db);
    log("PRÉVIA DO CADASTRO DE FOTOS DOS ALUNOS");
    log(JSON.stringify(previa.totais));
    log(previa.existe ? `Tabela aluno_foto já disponível. Fotos cadastradas: ${previa.fotos}.` : "Tabela aluno_foto: será criada, inicialmente vazia.");
    log("Registros atuais de alunos, contas e movimentações a alterar: 0.");
    if (!aplicar) {
        log("MODO PRÉVIA: nenhuma alteração foi feita.");
        log("Depois da conferência e confirmação: node .\\database\\preparar-fotos-alunos.js --aplicar");
        return previa;
    }
    const connection = await db.getConnection();
    let bloqueio = false;
    try {
        const [lock] = await connection.execute("SELECT GET_LOCK('formiguinha.preparar_fotos', 10) AS obtido");
        if (Number(lock[0].obtido) !== 1) throw new ErroPreparacao("Outra preparação está em andamento. Tente novamente.");
        bloqueio = true;
        const atual = await previaFotos(connection);
        if (!atual.existe) {
            // CREATE TABLE faz commit implícito no MySQL. Não altera registros existentes.
            await connection.execute(`CREATE TABLE aluno_foto (
                id_aluno ${atual.tipoId} NOT NULL PRIMARY KEY,
                imagem MEDIUMBLOB NOT NULL,
                largura SMALLINT UNSIGNED NOT NULL,
                altura SMALLINT UNSIGNED NOT NULL,
                id_usuario BIGINT NOT NULL,
                atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_aluno_foto_aluno FOREIGN KEY (id_aluno) REFERENCES aluno (id_aluno) ON DELETE CASCADE
            ) ENGINE=InnoDB`);
        }
        const depois = await previaFotos(connection);
        log("Preparação das fotos concluída. Nenhuma foto foi importada e nenhum saldo foi modificado.");
        log("Totais após a preparação: " + JSON.stringify(depois.totais));
        return depois;
    } finally {
        if (bloqueio) await connection.execute("SELECT RELEASE_LOCK('formiguinha.preparar_fotos') AS liberado").catch(() => {});
        connection.release();
    }
}

if (require.main === module) {
    require("dotenv").config({ quiet: true });
    const db = require("../api/config/database");
    (async () => {
        try {
            if (process.argv.slice(2).some(arg => arg !== "--aplicar")) throw new ErroPreparacao("Use somente o comando de prévia ou acrescente --aplicar após a conferência.");
            await prepararFotos(db, process.argv.includes("--aplicar"));
        } catch (erro) {
            console.error(erro instanceof ErroPreparacao ? erro.message : `Preparação interrompida (${erro.code || "ERRO"}). Nenhuma credencial foi exibida.`);
            process.exitCode = 1;
        } finally { await db.end(); }
    })();
}

module.exports = { prepararFotos, previaFotos };
