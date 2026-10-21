"use strict";

const { test } = require("node:test"), assert = require("node:assert/strict");
const { prepararFotos } = require("../database/preparar-fotos-alunos");

function bancoEsquema() {
    const state = { existe: false, escritas: [], tipo: "int unsigned", engine: "InnoDB", conflito: false, lock: 1, liberado: false };
    const totais = { contas: 2, movimentacoes: 3, saldo_total: "27.00" };
    const db = { state, async execute(sql) {
        if (sql.includes("JOIN information_schema.TABLES")) return [[{ COLUMN_TYPE: state.tipo, ENGINE: state.engine }]];
        if (sql.includes("information_schema.TABLES")) return [state.existe ? [{ ENGINE: "InnoDB" }] : []];
        if (sql.includes("information_schema.COLUMNS")) return [Object.entries({ id_aluno: state.tipo, imagem: state.conflito ? "varchar(200)" : "mediumblob",
            largura: "smallint unsigned", altura: "smallint unsigned", id_usuario: "bigint", atualizado_em: "timestamp" })
            .map(([COLUMN_NAME, COLUMN_TYPE]) => ({ COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE: "NO", COLUMN_DEFAULT: null, EXTRA: "" }))];
        if (sql.includes("SHOW INDEX")) return [[{ Key_name: "PRIMARY", Column_name: "id_aluno" }]];
        if (sql.includes("information_schema.KEY_COLUMN_USAGE")) return [[{ COLUMN_NAME: "id_aluno", REFERENCED_TABLE_NAME: "aluno", REFERENCED_COLUMN_NAME: "id_aluno" }]];
        if (sql.includes("AS contas")) return [[{ ...totais }]];
        if (sql.includes("COUNT(*) AS quantidade")) return [[{ quantidade: 0 }]];
        if (sql.includes("GET_LOCK")) return [[{ obtido: state.lock }]];
        if (sql.includes("RELEASE_LOCK")) return [[{ liberado: 1 }]];
        if (sql.startsWith("CREATE TABLE aluno_foto")) { state.existe = true; state.escritas.push(sql); return [{}]; }
        throw new Error("SQL inesperado no teste de preparação");
    }, async getConnection() { return { execute: db.execute, release() { state.liberado = true; } }; } };
    return db;
}

test("prévia de fotos lê o esquema e os totais sem criar nem alterar registros", async () => {
    const db = bancoEsquema(), resultado = await prepararFotos(db, false, () => {});
    assert.equal(resultado.existe, false); assert.equal(resultado.fotos, 0);
    assert.deepEqual(resultado.totais, { contas: 2, movimentacoes: 3, saldo_total: "27.00" });
    assert.equal(db.state.escritas.length, 0);
});

test("preparação de fotos copia o tipo do id, cria só uma tabela vazia e é repetível", async () => {
    const db = bancoEsquema();
    await prepararFotos(db, true, () => {}); await prepararFotos(db, true, () => {});
    assert.equal(db.state.escritas.length, 1);
    assert.match(db.state.escritas[0], /id_aluno int unsigned NOT NULL PRIMARY KEY/);
    assert.match(db.state.escritas[0], /FOREIGN KEY \(id_aluno\) REFERENCES aluno/);
    assert.equal(db.state.liberado, true);
});

test("esquema incompatível ou preparação simultânea interrompem fotos antes de escrever", async () => {
    for (const alterar of [s => s.engine = "MyISAM", s => s.tipo = "varchar(30)",
        s => { s.existe = true; s.conflito = true; }, s => s.lock = 0]) {
        const db = bancoEsquema(); alterar(db.state);
        await assert.rejects(prepararFotos(db, true, () => {}));
        assert.equal(db.state.escritas.length, 0);
    }
});
