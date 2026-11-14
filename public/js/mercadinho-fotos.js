"use strict";

window.FotoAluno = {
    criar({ csrf = "", editar = false, bloqueado = () => false, aoMudar = () => {}, antesEscolher = () => {} } = {}) {
        const $ = id => document.getElementById(id);
        let aluno = null, ocupada = false, rascunho = null, imagemUrl = null, ciclo = 0, consulta = null, erroPreparacao = false, escolhaAluno = null;
        function status(texto) { $("status-foto").textContent = texto; }
        function atualizar(externo = bloqueado()) {
            if (!editar) return;
            $("cadastrar-foto").disabled = externo || ocupada || !aluno;
            $("salvar-foto").disabled = externo || ocupada || !rascunho;
            $("cancelar-foto").disabled = externo || ocupada;
            $("acoes-foto").hidden = !rascunho;
        }
        function exibir(blob) {
            if (imagemUrl) URL.revokeObjectURL(imagemUrl);
            imagemUrl = blob ? URL.createObjectURL(blob) : null;
            if (imagemUrl) $("foto-aluno").src = imagemUrl;
            else $("foto-aluno").removeAttribute("src");
            $("foto-aluno").hidden = !blob;
            $("foto-ausente").hidden = !!blob;
        }
        function limpar() {
            ciclo++;
            consulta?.abort(); consulta = null;
            aluno = null; rascunho = null; erroPreparacao = false; escolhaAluno = null;
            if (editar) $("arquivo-foto").value = "";
            exibir(null); status("Foto ainda não cadastrada."); atualizar();
        }
        async function carregar() {
            const atual = aluno, versao = ++ciclo;
            consulta?.abort(); const controle = new AbortController(); consulta = controle;
            exibir(null); status("Consultando a foto…");
            const timer = setTimeout(() => controle.abort(), 15000);
            try {
                if (!atual?.foto_url) { status("Foto ainda não cadastrada."); return; }
                const resposta = await fetch(atual.foto_url, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: controle.signal });
                if (versao !== ciclo || aluno !== atual) return;
                if (resposta.status === 204 || resposta.status === 404) { status("Foto ainda não cadastrada."); return; }
                if (!resposta.ok) {
                    const dados = await resposta.json().catch(() => ({}));
                    if (versao !== ciclo || aluno !== atual) return;
                    erroPreparacao = dados.preparacaoNecessaria === true;
                    status(erroPreparacao ? "Cadastro de fotos aguardando a preparação do banco." : "Não foi possível consultar a foto agora.");
                    return;
                }
                if (!resposta.headers.get("content-type")?.startsWith("image/jpeg")) throw new Error("Formato inesperado");
                const imagem = await resposta.blob();
                if (versao !== ciclo || aluno !== atual) return;
                exibir(imagem); status("Foto cadastrada. Confira a identidade do aluno.");
            } catch { if (versao === ciclo) status("Foto indisponível no momento. A identificação pelo nome continua disponível."); }
            finally { clearTimeout(timer); }
        }
        async function preparar(arquivo) {
            if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) || arquivo.size > 10 * 1024 * 1024) {
                throw new Error("Escolha uma foto JPG, PNG ou WebP de até 10 MB.");
            }
            let origem, url;
            try {
                if (window.createImageBitmap) origem = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
                else {
                    url = URL.createObjectURL(arquivo);
                    origem = new Image(); origem.src = url; await origem.decode();
                }
                const largura = origem.width, altura = origem.height;
                if (!largura || !altura || largura * altura > 30000000) throw new Error("Escolha uma foto com resolução menor.");
                const escala = Math.min(1, 480 / Math.max(largura, altura));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(largura * escala)); canvas.height = Math.max(1, Math.round(altura * escala));
                const ctx = canvas.getContext("2d"); ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(origem, 0, 0, canvas.width, canvas.height);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.8));
                if (!blob || blob.size > 200 * 1024) throw new Error("Escolha uma foto menor para o cadastro.");
                return blob;
            } finally { origem?.close?.(); if (url) URL.revokeObjectURL(url); }
        }
        // A galeria e a câmera usam a mesma preparação e a mesma confirmação de salvamento.
        async function prepararFoto(arquivo, identificacao) {
            if (!editar || !arquivo || !aluno || ocupada || bloqueado()) return false;
            if (erroPreparacao) { status("Conclua primeiro a preparação do cadastro de fotos no banco."); return false; }
            if (identificacao !== aluno.identificacao) {
                $("arquivo-foto").value = ""; status("O aluno selecionado mudou. Escolha a foto novamente."); return false;
            }
            const atual = aluno, versao = ++ciclo;
            consulta?.abort(); ocupada = true; atualizar(); aoMudar();
            try {
                const foto = await preparar(arquivo);
                if (atual !== aluno || versao !== ciclo) return false;
                rascunho = foto;
                exibir(rascunho); status("Confira se a foto é deste aluno e clique em Salvar foto.");
                return true;
            } catch (erro) { if (atual === aluno && versao === ciclo) status(erro.message); return false; }
            finally { ocupada = false; $("arquivo-foto").value = ""; atualizar(); aoMudar(); }
        }
        if (editar) {
        $("cadastrar-foto").addEventListener("click", () => {
            if (!aluno || ocupada || bloqueado()) return;
            if (erroPreparacao) { status("Conclua primeiro a preparação do cadastro de fotos no banco."); return; }
            antesEscolher(); escolhaAluno = aluno.identificacao;
            $("arquivo-foto").click();
        });
        $("arquivo-foto").addEventListener("change", () => prepararFoto($("arquivo-foto").files[0], escolhaAluno));
        $("cancelar-foto").addEventListener("click", () => {
            if (ocupada || bloqueado()) return;
            rascunho = null; atualizar(); carregar();
        });
        $("salvar-foto").addEventListener("click", async () => {
            if (!aluno || !rascunho || ocupada || bloqueado()) return;
            ocupada = true; atualizar(); aoMudar(); status("Salvando a foto…");
            const controle = new AbortController(), timer = setTimeout(() => controle.abort(), 20000);
            try {
                const resposta = await fetch("/fotos-estudantes/api/fotos", { method: "POST", credentials: "same-origin", redirect: "error", signal: controle.signal,
                    headers: { "Content-Type": "image/jpeg", "X-CSRF-Token": csrf, "X-Identificacao-Aluno": aluno.identificacao }, body: rascunho });
                const dados = await resposta.json();
                if (!resposta.ok) throw new Error(dados.erro || "Não foi possível salvar a foto.");
                rascunho = null; await carregar();
            } catch (erro) { status(erro.name === "AbortError" ? "A resposta demorou. Você pode tentar salvar a mesma foto novamente."
                : erro.message === "Failed to fetch" ? "Não foi possível confirmar o salvamento. Tente salvar a mesma foto novamente." : erro.message); }
            finally { clearTimeout(timer); ocupada = false; atualizar(); aoMudar(); }
        });
        }
        window.addEventListener("pagehide", limpar);
        return { limpar, atualizar, prepararFoto, selecionar(valor) { limpar(); aluno = valor; atualizar(); carregar(); }, get ocupada() { return ocupada; } };
    }
};
