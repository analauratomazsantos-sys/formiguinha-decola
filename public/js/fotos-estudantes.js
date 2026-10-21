"use strict";

(() => {
    const $ = id => document.getElementById(id);
    if ($("filtro-fotos")) return; // A lista usa a pesquisa compartilhada.
    if (!$("identificacao-foto")) return;
    if (!window.FotoAluno) { $("status-foto").textContent = "Não foi possível carregar o cadastro de fotos. Atualize a página."; return; }
    let editor, camera;
    const links = Array.from(document.querySelectorAll("[data-navegacao-foto]"));
    const bloqueada = () => editor.ocupada || !!camera?.ativa;
    const atualizar = () => {
        links.forEach(link => {
            link.setAttribute("aria-disabled", bloqueada() ? "true" : "false");
            link.classList.toggle("navegacao-bloqueada", bloqueada());
        });
        camera?.atualizar();
    };
    editor = window.FotoAluno.criar({ editar: true, csrf: document.querySelector('meta[name="csrf-token"]').content,
        bloqueado: () => !!camera?.ativa, aoMudar: atualizar });
    if (window.CameraFotoAluno && $("tirar-foto")) {
        camera = window.CameraFotoAluno.criar({
            identificacao: () => $("identificacao-foto").value,
            podeAbrir: () => !editor.ocupada,
            aoMudar: () => { editor.atualizar(); atualizar(); },
            aoCapturar: (arquivo, identificacao) => editor.prepararFoto(arquivo, identificacao)
        });
    }
    const selecionar = () => editor.selecionar({ identificacao: $("identificacao-foto").value, foto_url: $("foto-aluno").dataset.fotoUrl });
    links.forEach(link => link.addEventListener("click", event => { if (bloqueada()) event.preventDefault(); }));
    window.addEventListener("pageshow", event => { if (event.persisted) selecionar(); });
    selecionar();
})();
