const form = document.getElementById("form-login");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const mensagem = document.getElementById("mensagem-login");

form.addEventListener("submit", (event) => {
    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    mensagem.classList.remove("sucesso");
    mensagem.textContent = "";

    if (email === "" || senha === "") {
        event.preventDefault();
        mensagem.textContent = "Preencha o e-mail e a senha.";
        return;
    }

    if (!emailInput.validity.valid) {
        event.preventDefault();
        mensagem.textContent = "Digite um e-mail válido.";
        return;
    }

    mensagem.classList.add("sucesso");
    mensagem.textContent = "Entrando...";
});
