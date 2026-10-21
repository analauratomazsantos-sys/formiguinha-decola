"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { criarServico, centavos, decimal, normalizarCodigo, assinarIdentificacao, verificarIdentificacao } = require("../api/services/mercadinhoService");
const { criarBancoFalso } = require("./mercadinho.fake-db");
const { dadosCriterio } = require("../database/preparar-mercadinho");

function cenario() {
    const db = criarBancoFalso();
    const servico = criarServico(db);
    const segredo = crypto.randomBytes(32).toString("hex");
    const token = assinarIdentificacao({ id_aluno: 1, id_conta: 10 }, 5, segredo);
    function body(extra = {}) { return { id_operacao: crypto.randomUUID(), identificacao: token,
        tipo: "SAIDA", valor: "7,50", descricao: "Um item de teste", saldo_esperado: "20.00", ...extra }; }
    return { db, servico, segredo, body };
}

test("valores exatos em centavos e duas casas decimais", () => {
    assert.equal(centavos("7,50"), 750); assert.equal(centavos("0.01"), 1);
    assert.equal(decimal(centavos("0.10") + centavos("0.20")), "0.30");
    for (const valor of ["-1", "0", "1.001", "1e3", "Infinity", "1.000,00", "", "3x", "0x10", "NaN"]) assert.throws(() => centavos(valor));
});
test("aceita QR de 32, 48 e 64 caracteres, URL FolhaPay e código curto", () => {
    assert.equal(normalizarCodigo("a".repeat(32)).tipo, "qr");
    assert.equal(normalizarCodigo(`https://exemplo.test/q/${"a".repeat(64)}`).valor, "a".repeat(64));
    assert.equal(normalizarCodigo("/q/" + "b".repeat(48)).tipo, "qr");
    assert.equal(normalizarCodigo("abc123").valor, "ABC123");
    for (const codigo of ["javascript:alert(1)", "https://exemplo.test/estudantes/1", "1", "' OR 1=1 --"]) assert.throws(() => normalizarCodigo(codigo));
});
test("assinatura impede trocar a conta, trocar o operador ou usar identificação vencida", () => {
    const segredo = "segredo-sintetico";
    const token = assinarIdentificacao({ id_aluno: 1, id_conta: 10 }, 5, segredo, 1000);
    assert.equal(verificarIdentificacao(token, 5, segredo, 1001).aluno, 1);
    assert.throws(() => verificarIdentificacao(token, 6, segredo, 1001));
    assert.throws(() => verificarIdentificacao(token + "x", 5, segredo, 1001));
    assert.throws(() => verificarIdentificacao(token, 5, segredo, 2000000));
});
test("localiza estudante sem depender de RA", async () => {
    const { servico } = cenario(); const aluno = await servico.buscarAluno("DEF456");
    assert.equal(aluno.id_aluno, 2); assert.equal(aluno.saldo, "7.00");
});
test("QR de 32 caracteres encontra a conta exata e não é reduzido aos seis primeiros", async () => {
    const { servico, db } = cenario();
    const qr = "a".repeat(32);
    db.state.contas.get(10).qr = qr;
    for (const entrada of [qr, qr.toUpperCase(), `https://exemplo.test/q/${qr}`, `/q/${qr}/`, "AAAAAA"]) {
        const aluno = await servico.buscarAluno(entrada);
        assert.equal(aluno.id_conta, 10);
        assert.equal(aluno.saldo, "20.00");
    }
    db.state.contas.get(20).qr = "a".repeat(6) + "b".repeat(26);
    await assert.rejects(servico.buscarAluno("AAAAAA"), { status: 409 });
    assert.equal((await servico.buscarAluno(qr)).id_conta, 10);
    await assert.rejects(servico.buscarAluno("a".repeat(31) + "b"), { status: 404 });
    assert.equal(db.state.movimentos.length, 0);
    assert.equal(db.state.contas.get(10).saldo, "20.00");
});
test("código inexistente, conta inativa e colisão são recusados", async () => {
    const { servico, db } = cenario();
    await assert.rejects(servico.buscarAluno("ZZZ999"), { status: 404 });
    db.state.contas.get(10).status = 0;
    await assert.rejects(servico.buscarAluno("ABC123"), { status: 409 });
    db.state.contas.get(10).status = 1;
    db.state.contas.get(20).codigo = "ABC123";
    await assert.rejects(servico.buscarAluno("ABC123"), { status: 409 });
});
test("compra debita saldo e registra o mesmo valor no movimento e no recibo", async () => {
    const { servico, db, body, segredo } = cenario();
    const r = await servico.registrar(body(), 5, segredo);
    assert.equal(r.saldo_posterior, "12.50"); assert.equal(db.state.contas.get(10).saldo, "12.50");
    assert.equal(db.state.movimentos.length, 1); assert.equal(db.state.movimentos[0].tipo, "SAIDA");
    assert.equal(db.state.movimentos[0].valor, "7.50"); assert.equal(db.state.operacoes.size, 1);
});
test("crédito aumenta o saldo e fica separado de frequência e tarefas", async () => {
    const { servico, db, body, segredo } = cenario();
    const r = await servico.registrar(body({ tipo: "ENTRADA", valor: "0.35", descricao: "Devolução autorizada" }), 5, segredo);
    assert.equal(r.saldo_posterior, "20.35"); assert.equal(db.state.movimentos[0].id_criterio, 101);
});
test("permite gastar exatamente o saldo, mas impede saldo negativo", async () => {
    const { servico, db, body, segredo } = cenario();
    await assert.rejects(servico.registrar(body({ valor: "20.01" }), 5, segredo), /Saldo insuficiente/);
    assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.operacoes.size, 0);
    const r = await servico.registrar(body({ valor: "20.00" }), 5, segredo);
    assert.equal(r.saldo_posterior, "0.00");
});
test("se o saldo mudar, exige nova conferência sem registrar movimento", async () => {
    const { servico, db, body, segredo } = cenario(); db.state.contas.get(10).saldo = "21.00";
    await assert.rejects(servico.registrar(body(), 5, segredo), e => e.status === 409 && e.detalhes.saldo === "21.00");
    assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.operacoes.size, 0);
});
test("duas confirmações simultâneas da mesma operação produzem somente um débito", async () => {
    const { servico, db, body, segredo } = cenario(); const dados = body();
    const resultado = await Promise.all([servico.registrar(dados, 5, segredo), servico.registrar(dados, 5, segredo)]);
    assert.equal(db.state.movimentos.length, 1); assert.equal(db.state.contas.get(10).saldo, "12.50");
    assert.equal(resultado.filter(r => r.repetida).length, 1);
});
test("duas compras diferentes na mesma conta não usam o mesmo saldo antigo", async () => {
    const { servico, db, body, segredo } = cenario();
    const r = await Promise.allSettled([servico.registrar(body({ valor: "15.00" }), 5, segredo), servico.registrar(body({ valor: "15.00" }), 5, segredo)]);
    assert.equal(r.filter(x => x.status === "fulfilled").length, 1);
    assert.equal(db.state.contas.get(10).saldo, "5.00"); assert.equal(db.state.movimentos.length, 1);
});
test("reutilizar a mesma chave com outro valor é recusado", async () => {
    const { servico, db, body, segredo } = cenario(); const dados = body();
    await servico.registrar(dados, 5, segredo);
    await assert.rejects(servico.registrar({ ...dados, valor: "1.00" }, 5, segredo), { status: 409 });
    assert.equal(db.state.movimentos.length, 1);
});
test("falha antes do commit desfaz movimento, saldo e recibo", async () => {
    const { servico, db, body, segredo } = cenario(); db.state.falhar = "saldo";
    await assert.rejects(servico.registrar(body(), 5, segredo));
    assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.operacoes.size, 0);
    assert.equal(db.state.contas.get(10).saldo, "20.00");
});
test("resposta perdida após commit recupera a operação sem cobrar outra vez", async () => {
    const { servico, db, body, segredo } = cenario(); const dados = body(); db.state.falhar = "resposta_commit";
    await assert.rejects(servico.registrar(dados, 5, segredo)); db.state.falhar = null;
    const r = await servico.registrar(dados, 5, segredo);
    assert.equal(r.repetida, true); assert.equal(db.state.movimentos.length, 1);
    assert.equal(db.state.contas.get(10).saldo, "12.50");
});
test("recibo só é recuperado pelo operador que o registrou", async () => {
    const { servico, body, segredo } = cenario(); const dados = body(); await servico.registrar(dados, 5, segredo);
    assert.equal((await servico.consultarRecibo(dados.id_operacao, 5)).valor, "7.50");
    assert.equal(await servico.consultarRecibo(dados.id_operacao, 6), null);
});
test("critério ausente interrompe a operação sem criar lançamentos", async () => {
    const { servico, db, body, segredo } = cenario(); db.state.semCriterio = true;
    await assert.rejects(servico.registrar(body(), 5, segredo), { status: 503 });
    assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.contas.get(10).saldo, "20.00");
});
test("prévia não inventa valores para colunas obrigatórias desconhecidas", () => {
    assert.throws(() => dadosCriterio([{ COLUMN_NAME: "regra_desconhecida", IS_NULLABLE: "NO", COLUMN_DEFAULT: null, EXTRA: "" }], "Nome", "SAIDA"));
});
