"use strict";

(() => {
    const filtro = document.getElementById("filtro-folhapay");
    if (!filtro) return;
    const linhas = Array.from(document.querySelectorAll(".linha-folhapay"));
    const mais = document.getElementById("mais-folhapay");
    const normalizar = texto => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    let limite = 50;
    function atualizar() {
        const busca = normalizar(filtro.value.trim());
        let encontradas = 0, exibidas = 0;
        linhas.forEach(linha => {
            const coincide = normalizar(linha.querySelector("span").textContent).includes(busca);
            if (coincide) encontradas++;
            linha.hidden = !coincide || exibidas >= limite;
            if (!linha.hidden) exibidas++;
        });
        document.getElementById("quantidade-folhapay").textContent = `Mostrando ${exibidas} de ${encontradas} estudantes encontrados.`;
        document.getElementById("folhapay-sem-resultados").hidden = encontradas > 0;
        mais.hidden = encontradas <= exibidas;
    }
    filtro.addEventListener("input", () => { limite = 50; atualizar(); });
    mais.addEventListener("click", () => { limite += 50; atualizar(); });
    atualizar();
})();
