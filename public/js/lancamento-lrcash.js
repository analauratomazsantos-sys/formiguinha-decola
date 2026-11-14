const form = document.getElementById("form-lrcash");
const estudanteSelect = document.getElementById("estudante");
const criterioSelect = document.getElementById("criterio");
const valorInput = document.getElementById("valor");
const erroEstudante = document.getElementById("erro-estudante");
const erroCriterio = document.getElementById("erro-criterio");
const erroValor = document.getElementById("erro-valor");
const mensagem = document.getElementById("mensagem-lrcash");

form.addEventListener("submit", (event) => {
    const estudante = estudanteSelect.value;
    const criterio = criterioSelect.value;
    const valorTexto = valorInput.value;
    const valor = Number(valorTexto);
    let formularioValido = true;

    erroEstudante.textContent = "";
    erroCriterio.textContent = "";
    erroValor.textContent = "";
    mensagem.textContent = "";
    mensagem.classList.remove("sucesso");

    if (estudante === "") {
        event.preventDefault();
        erroEstudante.textContent = "Selecione um estudante.";
        formularioValido = false;
    }

    if (criterio === "") {
        event.preventDefault();
        erroCriterio.textContent = "Selecione um critério.";
        formularioValido = false;
    }

    if (valorTexto === "" || Number.isNaN(valor) || valor <= 0) {
        event.preventDefault();
        erroValor.textContent = "Informe um valor maior que zero.";
        formularioValido = false;
    }

    if (!formularioValido) {
        mensagem.textContent = "Corrija os campos indicados.";
        return;
    }

    mensagem.classList.add("sucesso");
    mensagem.textContent = "Registrando crédito...";
});
