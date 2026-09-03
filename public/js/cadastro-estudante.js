const form = document.getElementById("form-cadastro-estudante");
const nomeInput = document.getElementById("nome");
const raInput = document.getElementById("ra");
const turmaSelect = document.getElementById("turma");
const erroNome = document.getElementById("erro-nome");
const erroRa = document.getElementById("erro-ra");
const erroTurma = document.getElementById("erro-turma");
const mensagem = document.getElementById("mensagem-cadastro");

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const nome = nomeInput.value.trim();
    const ra = raInput.value.trim();
    const turma = turmaSelect.value;
    let formularioValido = true;

    erroNome.textContent = "";
    erroRa.textContent = "";
    erroTurma.textContent = "";
    mensagem.textContent = "";
    mensagem.classList.remove("sucesso");

    if (nome === "") {
        erroNome.textContent = "Informe o nome do estudante.";
        formularioValido = false;
    } else if (nome.length < 3) {
        erroNome.textContent = "O nome deve possuir pelo menos 3 caracteres.";
        formularioValido = false;
    }

    if (ra === "") {
        erroRa.textContent = "Informe o RA do estudante.";
        formularioValido = false;
    }

    if (turma === "") {
        erroTurma.textContent = "Selecione uma turma.";
        formularioValido = false;
    }

    if (!formularioValido) {
        mensagem.textContent = "Corrija os campos indicados.";
        return;
    }

    mensagem.classList.add("sucesso");
    mensagem.textContent = "Dados validados. Aguardando integração com o servidor.";
});