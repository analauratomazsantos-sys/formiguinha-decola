const form = document.getElementById("form-extrato");
const estudanteSelect = document.getElementById("estudante");
const erroEstudante = document.getElementById("erro-estudante");
const mensagem = document.getElementById("mensagem-extrato");

form.addEventListener("submit", (event) => {
    erroEstudante.textContent = "";
    mensagem.textContent = "";

    if (estudanteSelect.value === "") {
        event.preventDefault();
        erroEstudante.textContent = "Selecione um estudante.";
        mensagem.textContent = "Escolha um estudante para consultar o extrato.";
        return;
    }
});