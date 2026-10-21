/* Cálculo compartilhado pelo navegador e pelo servidor, sempre em centavos. */
"use strict";

(function (raiz, criar) {
    if (typeof module === "object" && module.exports) module.exports = criar();
    else raiz.MercadinhoItens = criar();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const MAX_ITENS = 10;
    const MAX_VALOR = 99999999;

    function decimal(centavos) {
        return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`;
    }

    function quantidade(valor) {
        const texto = String(valor ?? "").trim();
        if (!/^\d{1,3}$/.test(texto) || Number(texto) < 1) {
            throw new Error("Informe uma quantidade inteira entre 1 e 999.");
        }
        return Number(texto);
    }

    function preco(valor) {
        const texto = String(valor ?? "").trim();
        if (!/^\d{1,7}([.,]\d{1,2})?$/.test(texto)) {
            throw new Error("Informe um preço unitário positivo com até duas casas decimais.");
        }
        const [inteiro, fracao = ""] = texto.replace(",", ".").split(".");
        const centavos = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
        if (!Number.isSafeInteger(centavos) || centavos < 1 || centavos > MAX_VALOR) {
            throw new Error("Informe um preço unitário entre 0,01 e 999.999,99 LRCash.");
        }
        return centavos;
    }

    function calcularSubtotal(qtd, valorUnitario) {
        const total = quantidade(qtd) * preco(valorUnitario);
        if (!Number.isSafeInteger(total) || total > MAX_VALOR) {
            throw new Error("O total da compra pode ser de até 999.999,99 LRCash.");
        }
        return total;
    }

    function calcularItens(entrada) {
        if (!Array.isArray(entrada) || entrada.length < 1 || entrada.length > MAX_ITENS) {
            throw new Error(`Informe entre 1 e ${MAX_ITENS} itens na compra.`);
        }
        let total = 0;
        const itens = entrada.map((item, indice) => {
            if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.nome !== "string") {
                throw new Error(`Item ${indice + 1}: informe o nome do produto.`);
            }
            const nome = item.nome.trim();
            if (!nome || nome.length > 40 || /[\u0000-\u001f\u007f]/.test(nome)) {
                throw new Error(`Item ${indice + 1}: use um nome de até 40 caracteres, em uma linha.`);
            }
            let qtd, unitario, subtotal;
            try {
                qtd = quantidade(item.quantidade);
                unitario = preco(item.valor_unitario);
                subtotal = calcularSubtotal(qtd, item.valor_unitario);
            } catch (erro) { throw new Error(`Item ${indice + 1}: ${erro.message}`); }
            total += subtotal;
            if (!Number.isSafeInteger(total) || total > MAX_VALOR) {
                throw new Error("O total da compra pode ser de até 999.999,99 LRCash.");
            }
            return { nome, quantidade: qtd, valor_unitario: decimal(unitario) };
        });
        const descricao = itens.map(item => `${item.quantidade}x ${item.nome} (un. ${item.valor_unitario.replace(".", ",")})`).join("; ");
        if (descricao.length > 200) {
            throw new Error("A lista ficou longa para o comprovante. Abrevie os nomes dos itens ou divida a compra em duas partes.");
        }
        return { itens, descricao, centavos: total, valor: decimal(total) };
    }

    return Object.freeze({ MAX_ITENS, calcularSubtotal, calcularItens });
});
