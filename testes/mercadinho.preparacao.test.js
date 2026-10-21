"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { preparar } = require("../database/preparar-mercadinho");

function schemaFalso() {
    const s = { recibos: false, criterios: [], escritas: [], engine: "InnoDB", duplicado: false, desconhecido: false };
    const nomes = ["id_operacao", "id_usuario", "requisicao_hash", "id_conta", "id_aluno", "id_movimentacao", "tipo", "valor", "saldo_anterior", "saldo_posterior", "descricao", "criado_em"];
    const coluna = (t, n, tipo = "varchar(255)") => ({ TABLE_NAME: t, COLUMN_NAME: n, COLUMN_TYPE: tipo, IS_NULLABLE: "YES", COLUMN_DEFAULT: null, EXTRA: "", CHARACTER_MAXIMUM_LENGTH: 255 });
    const db = {
        state: s,
        async execute(sql, p = []) {
            if (sql.includes("information_schema.TABLES")) return [[...(["aluno", "turma", "conta", "movimentacao", "criterio", "usuario", ...(s.recibos ? ["mercadinho_operacao"] : [])].map(nome => ({ TABLE_NAME: nome, ENGINE: nome === "conta" ? s.engine : "InnoDB" })))]];
            if (sql.includes("information_schema.COLUMNS")) return [[
                ...["id_criterio", "nome_criterio", "ativo"].map(n => coluna("criterio", n)),
                coluna("movimentacao", "tipo", "enum('ENTRADA','SAIDA')"), coluna("movimentacao", "descricao_observacao"),
                ...(s.recibos ? nomes.map(n => coluna("mercadinho_operacao", n)) : []),
                ...(s.desconhecido ? [{ ...coluna("criterio", "regra_desconhecida"), IS_NULLABLE: "NO" }] : [])
            ]];
            if (sql.startsWith("SHOW INDEX")) return [[{ Key_name: "PRIMARY", Column_name: "id_operacao" }]];
            if (sql.startsWith("SELECT id_criterio")) {
                const rows = s.criterios.filter(c => c.nome_criterio === p[0]);
                return [s.duplicado ? [{ ativo: 1 }, { ativo: 1 }] : rows];
            }
            if (sql.includes("AS contas")) return [[{ contas: 2, movimentacoes: 3, saldo_total: "27.00" }]];
            if (sql.includes("GET_LOCK")) return [[{ obtido: 1 }]];
            if (sql.includes("RELEASE_LOCK")) return [[{ liberado: 1 }]];
            if (sql.startsWith("INSERT INTO criterio")) { s.escritas.push(sql); s.criterios.push({ id_criterio: s.criterios.length + 100, nome_criterio: p[0], ativo: 1 }); return [{ affectedRows: 1 }]; }
            throw new Error("SQL não previsto no esquema de teste");
        },
        async query(sql) { s.escritas.push(sql); s.recibos = true; },
        async getConnection() { return { ...db, async beginTransaction() {}, async commit() {}, async rollback() {}, release() {} }; }
    };
    return db;
}

test("preparação em modo padrão executa somente leituras e preserva os totais", async () => {
    const db = schemaFalso(); const previa = await preparar(db, false, () => {});
    assert.equal(db.state.escritas.length, 0); assert.equal(db.state.recibos, false);
    assert.deepEqual(previa.totais, { contas: 2, movimentacoes: 3, saldo_total: "27.00" });
});
test("preparação aplicada cria só a tabela e dois critérios, e pode ser repetida", async () => {
    const db = schemaFalso(); await preparar(db, true, () => {});
    assert.equal(db.state.escritas.length, 3); assert.equal(db.state.criterios.length, 2);
    await preparar(db, true, () => {});
    assert.equal(db.state.escritas.length, 3); assert.equal(db.state.criterios.length, 2);
});
test("motor não transacional, critérios duplicados e campo obrigatório desconhecido impedem escritas", async () => {
    for (const alterar of [s => s.engine = "MyISAM", s => s.duplicado = true, s => s.desconhecido = true]) {
        const db = schemaFalso(); alterar(db.state);
        await assert.rejects(preparar(db, true, () => {})); assert.equal(db.state.escritas.length, 0);
    }
});
