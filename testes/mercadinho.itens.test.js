"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { calcularItens } = require("../public/js/mercadinho-itens");
const { criarServico, assinarIdentificacao } = require("../api/services/mercadinhoService");
const { criarBancoFalso } = require("./mercadinho.fake-db");

const itens = [{ nome: "Caderno", quantidade: 2, valor_unitario: "2,50" },
    { nome: "Lápis", quantidade: 3, valor_unitario: "0.10" }];

test("itens multiplicam a quantidade e somam os centavos sem arredondamento binário", () => {
    const resultado = calcularItens(itens);
    assert.equal(resultado.valor, "5.30");
    assert.equal(resultado.centavos, 530);
    assert.equal(resultado.descricao, "2x Caderno (un. 2,50); 3x Lápis (un. 0,10)");
    assert.equal(calcularItens([{ nome: "Item", quantidade: 3, valor_unitario: "0,10" }]).valor, "0.30");
});

test("itens recusam quantidades fracionadas, preços inválidos, excesso de total e nomes longos", () => {
    for (const quantidade of [0, -1, 1.5, 1000, "1e2", "", null]) {
        assert.throws(() => calcularItens([{ nome: "Item", quantidade, valor_unitario: "1.00" }]));
    }
    for (const valor_unitario of [0, -1, "1.001", "1e2", "1.000,00", "NaN", "1000000", ""]) {
        assert.throws(() => calcularItens([{ nome: "Item", quantidade: 1, valor_unitario }]));
    }
    for (const entrada of [[], null, {}, Array(11).fill(itens[0]), [{ ...itens[0], nome: "x".repeat(41) }], [{ ...itens[0], nome: "A\nB" }]]) {
        assert.throws(() => calcularItens(entrada));
    }
    assert.throws(() => calcularItens([{ nome: "Item", quantidade: 2, valor_unitario: "999999.99" }]));
    assert.throws(() => calcularItens(Array(6).fill({ nome: "x".repeat(30), quantidade: 1, valor_unitario: "1.00" })), /lista ficou longa/);
});

function cenario() {
    const db = criarBancoFalso(), servico = criarServico(db), segredo = "segredo-sintetico-do-teste";
    const calculo = calcularItens(itens);
    const body = { id_operacao: crypto.randomUUID(), identificacao: assinarIdentificacao({ id_aluno: 1, id_conta: 10 }, 5, segredo),
        tipo: "SAIDA", itens: calculo.itens, valor: calculo.valor, descricao: calculo.descricao, saldo_esperado: "20.00" };
    return { db, servico, segredo, body };
}

test("servidor confere os itens antes do débito e registra o detalhamento no extrato", async () => {
    const { db, servico, segredo, body } = cenario();
    const recibo = await servico.registrar(body, 5, segredo);
    assert.equal(recibo.valor, "5.30");
    assert.equal(recibo.saldo_posterior, "14.70");
    assert.equal(db.state.movimentos[0].descricao, body.descricao);
    const repetida = await servico.registrar(body, 5, segredo);
    assert.equal(repetida.repetida, true);
    assert.equal(db.state.movimentos.length, 1);
});

test("total, descrição ou quantidade adulterados não alteram saldo nem criam movimento", async () => {
    for (const alterar of [b => ({ ...b, valor: "0.01" }), b => ({ ...b, descricao: "Descrição trocada" }),
        b => ({ ...b, itens: [{ ...b.itens[0], quantidade: 9 }, b.itens[1]] }), b => ({ ...b, tipo: "ENTRADA" })]) {
        const { db, servico, segredo, body } = cenario();
        await assert.rejects(servico.registrar(alterar(body), 5, segredo), { status: 400 });
        assert.equal(db.state.movimentos.length, 0);
        assert.equal(db.state.operacoes.size, 0);
        assert.equal(db.state.contas.get(10).saldo, "20.00");
    }
});

test("resposta perdida de uma compra com itens é recuperada sem cobrar novamente", async () => {
    const { db, servico, segredo, body } = cenario();
    db.state.falhar = "resposta_commit";
    await assert.rejects(servico.registrar(body, 5, segredo));
    db.state.falhar = null;
    const recibo = await servico.registrar(body, 5, segredo);
    assert.equal(recibo.repetida, true);
    assert.equal(db.state.movimentos.length, 1);
    assert.equal(db.state.contas.get(10).saldo, "14.70");
});
