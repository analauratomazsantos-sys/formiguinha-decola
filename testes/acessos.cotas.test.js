"use strict";
const { test } = require("node:test"), assert = require("node:assert/strict"), crypto = require("node:crypto");
const { criarBancoFalso } = require("./mercadinho.fake-db");
const { criarServicoCotas } = require("../api/services/cotaFuncionarioService");
const { criarServico, assinarIdentificacao } = require("../api/services/mercadinhoService");
const novo = (extra = {}) => ({ id_operacao: crypto.randomUUID(), estudanteId: "1", criterio: "DISTRIBUICAO_AULA", valor: "10.00", observacao: "Atividade em aula", ...extra });
const liberar = (s, valor = "100.00") => s.liberar({ id_operacao: crypto.randomUUID(), funcionarioId: "6", valor, observacao: "Atividades da semana" }, 5);
async function creditoCaixa(db, valor, aluno = 2) {
    const s = criarServico(db), a = await s.buscarAlunoPorId(aluno);
    return { s, body: { id_operacao: crypto.randomUUID(), tipo: "ENTRADA", valor, descricao: "Crédito autorizado em aula", saldo_esperado: a.saldo, identificacao: assinarIdentificacao(a, 6, "segredo-exclusivo-do-teste") } };
}
test("administração libera 100 e distribuição de 10 deixa 90, com histórico e sem alterar outros alunos", async () => {
    const db = criarBancoFalso(), s = criarServicoCotas(db);
    await liberar(s);
    assert.equal(db.state.usuarios.get(6).saldo_cota, "100.00"); assert.equal(db.state.movimentos.length, 0);
    assert.equal(db.state.contas.get(10).saldo, "20.00");
    const r = await s.distribuir(novo(), 6);
    assert.equal(r.cota_posterior, "90.00"); assert.equal(db.state.usuarios.get(6).saldo_cota, "90.00");
    assert.equal(db.state.contas.get(10).saldo, "30.00"); assert.equal(db.state.contas.get(20).saldo, "7.00");
    assert.equal(db.state.movimentos.length, 1); assert.equal(db.state.cotas.size, 2);
    assert.equal((await s.historico(6)).length, 2); assert.equal((await s.historico(999)).length, 0);
});
test("funcionário não libera cota nem usa perfil ou cota enviados no formulário", async () => {
    const db = criarBancoFalso(), s = criarServicoCotas(db);
    await assert.rejects(s.liberar({ id_operacao: crypto.randomUUID(), funcionarioId: "6", valor: "100.00" }, 6), { status: 403 });
    await assert.rejects(s.distribuir(novo({ perfil: "ADMIN", saldo_cota: "999.00" }), 6), { status: 409 });
    assert.equal(db.state.cotas.size, 0); assert.equal(db.state.movimentos.length, 0);
});
test("duas distribuições simultâneas não ultrapassam a cota e permitem usar exatamente o saldo restante", async () => {
    const db = criarBancoFalso(), s = criarServicoCotas(db); await liberar(s, "10.00");
    const resultados = await Promise.allSettled([s.distribuir(novo({ valor: "7.00" }), 6), s.distribuir(novo({ estudanteId: "2", valor: "7.00" }), 6)]);
    assert.equal(resultados.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(resultados.find(r => r.status === "rejected").reason.status, 409);
    assert.equal(db.state.usuarios.get(6).saldo_cota, "3.00"); assert.equal(db.state.movimentos.length, 1);
    await s.distribuir(novo({ valor: "3.00" }), 6); assert.equal(db.state.usuarios.get(6).saldo_cota, "0.00");
    await assert.rejects(s.distribuir(novo({ valor: "0.01" }), 6), { status: 409 });
});
test("crédito pelo caixa também consome cota e disputa o mesmo limite com o lançamento em aula", async () => {
    const db = criarBancoFalso(), s = criarServicoCotas(db); await liberar(s, "10.00");
    const caixa = await creditoCaixa(db, "7.00");
    const resultados = await Promise.allSettled([s.distribuir(novo({ valor: "7.00" }), 6), caixa.s.registrar(caixa.body, 6, "segredo-exclusivo-do-teste")]);
    assert.equal(resultados.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(db.state.usuarios.get(6).saldo_cota, "3.00"); assert.equal(db.state.movimentos.length, 1);
    const outro = await creditoCaixa(db, "4.00"); await assert.rejects(outro.s.registrar(outro.body, 6, "segredo-exclusivo-do-teste"), { status: 409 });
    assert.equal(db.state.movimentos.length, 1);
});
test("repetição simultânea ou após resposta perdida não duplica crédito nem consumo de cota", async () => {
    const db = criarBancoFalso(), s = criarServicoCotas(db); await liberar(s);
    const body = novo();
    const r = await Promise.all([s.distribuir(body, 6), s.distribuir(body, 6)]);
    assert.equal(r.filter(x => x.repetida).length, 1); assert.equal(db.state.movimentos.length, 1); assert.equal(db.state.usuarios.get(6).saldo_cota, "90.00");
    const perdido = novo(); db.state.falhar = "resposta_commit";
    await assert.rejects(s.distribuir(perdido, 6)); db.state.falhar = null;
    assert.equal((await s.distribuir(perdido, 6)).repetida, true);
    assert.equal(db.state.movimentos.length, 2); assert.equal(db.state.usuarios.get(6).saldo_cota, "80.00");
    await assert.rejects(s.distribuir({ ...body, valor: "11.00" }, 6), { status: 409 });
    assert.equal(await s.consultar("DISTRIBUICAO", body.id_operacao, 5), null);
});
test("repetição de liberação não soma outra cota e funcionário inativo não recebe novas liberações", async () => {
    const db = criarBancoFalso(), s = criarServicoCotas(db);
    const op = { id_operacao: crypto.randomUUID(), funcionarioId: "6", valor: "100.00" };
    await Promise.all([s.liberar(op, 5), s.liberar(op, 5)]);
    assert.equal(db.state.usuarios.get(6).saldo_cota, "100.00"); assert.equal(db.state.cotas.size, 1);
    db.state.usuarios.get(6).ativo = 0;
    await assert.rejects(liberar(s), { status: 401 });
});
test("falha desfaz cota, saldo, registro e histórico, tanto na aula quanto no caixa", async () => {
    for (const caminho of ["aula", "caixa"]) {
        const db = criarBancoFalso(), s = criarServicoCotas(db); await liberar(s);
        const caixa = await creditoCaixa(db, "10.00"); db.state.falhar = "saldo";
        await assert.rejects(caminho === "aula" ? s.distribuir(novo(), 6) : caixa.s.registrar(caixa.body, 6, "segredo-exclusivo-do-teste"));
        assert.equal(db.state.usuarios.get(6).saldo_cota, "100.00"); assert.equal(db.state.contas.get(10).saldo, "20.00"); assert.equal(db.state.contas.get(20).saldo, "7.00");
        assert.equal(db.state.movimentos.length, 0); assert.equal(db.state.cotas.size, 1); assert.equal(db.state.operacoes.size, 0);
    }
});
test("crédito administrativo permanece disponível e valores ou critérios inválidos não registram nada", async () => {
    const db = criarBancoFalso(), s = criarServicoCotas(db);
    await s.distribuir(novo(), 5); assert.equal(db.state.contas.get(10).saldo, "30.00"); assert.equal(db.state.usuarios.get(5).saldo_cota, "0.00");
    for (const extra of [{ valor: "0" }, { valor: "-1" }, { valor: "1.001" }, { valor: {} }, { estudanteId: "1 OR 1=1" }, { criterio: "constructor" }, { tipo: "SAIDA" }]) await assert.rejects(s.distribuir(novo(extra), 5), { status: 400 });
    assert.equal(db.state.movimentos.length, 1);
    db.state.usuarios.get(6).trocar_senha = 1; await assert.rejects(s.distribuir(novo(), 6), { status: 403 });
});
