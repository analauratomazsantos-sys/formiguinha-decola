
const imagens = [
    "images/escola-1.jpeg",
    "images/escola-2.jpeg",
    "images/escola-3.jpeg",
    "images/escola-4.jpeg"
];


let imagemAtual = 0;

const imagem = document.querySelector(".carrossel-imagem img");
const indicadores = document.querySelectorAll(".indicadores span");

function mostrarImagem(indice) {
    imagemAtual = indice;

    imagem.src = imagens[imagemAtual];

    indicadores.forEach((indicador, index) => {
        indicador.classList.toggle("ativo", index === imagemAtual);
    });
}

function proximaImagem() {
    imagemAtual++;

    if (imagemAtual >= imagens.length) {
        imagemAtual = 0;
    }

    mostrarImagem(imagemAtual);
}

function imagemAnterior() {
    imagemAtual--;

    if (imagemAtual < 0) {
        imagemAtual = imagens.length - 1;
    }

    mostrarImagem(imagemAtual);
}

document.querySelector(".seta.proxima")
    .addEventListener("click", proximaImagem);

document.querySelector(".seta.anterior")
    .addEventListener("click", imagemAnterior);

indicadores.forEach((indicador, index) => {
    indicador.addEventListener("click", () => {
        mostrarImagem(index);
    });
});

// Troca automática a cada 5 segundos
setInterval(proximaImagem, 5000);