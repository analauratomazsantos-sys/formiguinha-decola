"use strict";
(() => {
    const form = document.getElementById("form-cadastro-estudante");
    if (!form) return;
    form.addEventListener("submit", event => {
        const mensagens = { nome: "", ra: "", turma: "" };
        const nome = form.elements.nome.value.trim(), ra = form.elements.ra.value.trim();
        if (nome.length < 3 || nome.length > 120) mensagens.nome = "Informe um nome de 3 a 120 caracteres.";
        if (!/^\d{12}$/.test(ra)) mensagens.ra = "O RA deve conter exatamente 12 números.";
        if (!form.elements.turma.value) mensagens.turma = "Selecione a turma.";
        for (const [campo, mensagem] of Object.entries(mensagens)) document.getElementById(`erro-${campo}`).textContent = mensagem;
        if (Object.values(mensagens).some(Boolean)) {
            event.preventDefault(); document.getElementById("mensagem-cadastro").textContent = "Confira os campos indicados.";
            form.elements[Object.keys(mensagens).find(c => mensagens[c])].focus();
        }
    });
})();
