"use strict";

window.CameraFotoAluno = {
    criar({ identificacao, podeAbrir, aoMudar, aoCapturar }) {
        const $ = id => document.getElementById(id);
        const video = $("video-foto"), area = $("camera-foto");
        let fluxo = null, dispositivos = [], ativa = false, abrindo = false, capturando = false;
        let ciclo = 0, timer = null, estudante = null, lado = "environment";

        function atualizar() {
            $("tirar-foto").disabled = ativa || !podeAbrir();
            $("tirar-foto").setAttribute("aria-expanded", ativa ? "true" : "false");
            $("capturar-foto").disabled = !ativa || abrindo || capturando || video.readyState < 2;
            $("trocar-camera-foto").disabled = !ativa || abrindo || capturando;
            $("trocar-camera-foto").hidden = !ativa || dispositivos.length < 2;
        }
        function liberar() {
            const anterior = fluxo;
            fluxo = null;
            anterior?.getTracks().forEach(trilha => trilha.stop());
            video.pause(); video.srcObject = null;
        }
        function fechar(mensagem = "", devolverFoco = false) {
            ciclo++; clearTimeout(timer); timer = null;
            liberar(); ativa = false; abrindo = false; capturando = false;
            estudante = null; dispositivos = []; area.hidden = true;
            $("status-camera-foto").textContent = "";
            atualizar(); aoMudar();
            if (mensagem) $("status-foto").textContent = mensagem;
            if (devolverFoco) $("tirar-foto").focus();
        }
        function mensagemErro(erro) {
            if (["NotAllowedError", "SecurityError"].includes(erro.name))
                return "Permita o uso da câmera no navegador e clique em Tirar foto novamente. Você também pode escolher da galeria.";
            if (["NotFoundError", "DevicesNotFoundError"].includes(erro.name))
                return "Nenhuma câmera foi encontrada. Conecte uma câmera ou escolha uma foto da galeria.";
            if (["NotReadableError", "TrackStartError"].includes(erro.name))
                return "A câmera está indisponível ou em uso. Feche os outros aplicativos que usam a câmera e tente novamente.";
            return "Não foi possível abrir a câmera. Tente novamente ou escolha uma foto da galeria.";
        }
        async function abrir(dispositivo = null, orientacao = "environment") {
            if (abrindo || capturando || !podeAbrir()) return;
            if (!navigator.mediaDevices?.getUserMedia) {
                $("status-foto").textContent = "A câmera não está disponível neste endereço. No celular, abra o site com HTTPS. Você também pode escolher uma foto da galeria.";
                return;
            }
            if (!ativa) estudante = identificacao();
            if (!estudante || estudante !== identificacao()) { fechar("O estudante selecionado mudou. Reabra a página dele antes de tirar a foto."); return; }
            const atual = ++ciclo;
            liberar(); ativa = true; abrindo = true; area.hidden = false;
            $("status-camera-foto").textContent = "Abrindo a câmera… Se solicitado, permita o acesso no navegador.";
            atualizar(); aoMudar();
            // Uma permissão atrasada não pode reabrir a câmera depois de fechar a tela.
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (atual === ciclo) fechar("A abertura da câmera demorou. Confira a permissão no navegador e tente novamente.", true);
            }, 25000);
            let novo;
            try {
                const tamanho = { width: { ideal: 1280 }, height: { ideal: 960 } };
                try {
                    novo = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
                        ...tamanho, ...(dispositivo ? { deviceId: { exact: dispositivo } } : { facingMode: { ideal: orientacao } })
                    } });
                } catch (erro) {
                    if (atual !== ciclo) return;
                    if (!dispositivo || !["OverconstrainedError", "NotFoundError"].includes(erro.name)) throw erro;
                    novo = await navigator.mediaDevices.getUserMedia({ audio: false, video: { ...tamanho, facingMode: { ideal: orientacao } } });
                }
                if (atual !== ciclo) { novo.getTracks().forEach(trilha => trilha.stop()); return; }
                fluxo = novo; video.srcObject = novo;
                novo.getVideoTracks().forEach(trilha => trilha.addEventListener("ended", () => {
                    if (fluxo === novo) fechar("A câmera foi desconectada. Conecte-a novamente ou escolha uma foto da galeria.", true);
                }, { once: true }));
                await video.play();
                if (atual !== ciclo) { novo.getTracks().forEach(trilha => trilha.stop()); return; }
                lado = novo.getVideoTracks()[0]?.getSettings().facingMode || orientacao;
                try { dispositivos = (await navigator.mediaDevices.enumerateDevices()).filter(item => item.kind === "videoinput" && item.deviceId); }
                catch { dispositivos = []; }
                if (atual !== ciclo) return;
                clearTimeout(timer); timer = null; abrindo = false;
                $("status-camera-foto").textContent = "Enquadre o rosto e clique em Capturar foto. A imagem ainda não será salva.";
                atualizar(); aoMudar(); $("capturar-foto").focus();
            } catch (erro) {
                novo?.getTracks().forEach(trilha => trilha.stop());
                if (atual === ciclo) fechar(mensagemErro(erro), true);
            }
        }
        async function capturar() {
            if (!ativa || abrindo || capturando || !fluxo || video.readyState < 2) return;
            if (estudante !== identificacao()) { fechar("O estudante selecionado mudou. Reabra a página dele antes de tirar a foto.", true); return; }
            const atual = ciclo, aluno = estudante;
            const largura = video.videoWidth, altura = video.videoHeight;
            if (!largura || !altura) { $("status-camera-foto").textContent = "Aguarde a imagem da câmera antes de capturar."; return; }
            capturando = true; atualizar();
            try {
                const escala = Math.min(1, 480 / Math.max(largura, altura));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(largura * escala));
                canvas.height = Math.max(1, Math.round(altura * escala));
                const contexto = canvas.getContext("2d");
                contexto.fillStyle = "white"; contexto.fillRect(0, 0, canvas.width, canvas.height);
                contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
                const foto = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
                if (atual !== ciclo) return;
                if (!foto) throw new Error("Não foi possível capturar esta imagem. Tente novamente.");
                fechar();
                if (await aoCapturar(foto, aluno)) $("salvar-foto").focus();
            } catch (erro) {
                if (atual === ciclo) {
                    capturando = false;
                    $("status-camera-foto").textContent = erro.message || "Não foi possível capturar. Tente novamente.";
                    atualizar();
                }
            }
        }
        $("tirar-foto").addEventListener("click", () => abrir());
        $("capturar-foto").addEventListener("click", capturar);
        $("trocar-camera-foto").addEventListener("click", () => {
            if (!ativa || abrindo || capturando || dispositivos.length < 2) return;
            const id = fluxo?.getVideoTracks()[0]?.getSettings().deviceId;
            const indice = dispositivos.findIndex(item => item.deviceId === id);
            const proximo = dispositivos[(indice + 1) % dispositivos.length];
            abrir(proximo.deviceId, lado === "environment" ? "user" : "environment");
        });
        $("fechar-camera-foto").addEventListener("click", () => fechar("Câmera fechada. Você pode tirar outra foto ou escolher uma imagem da galeria.", true));
        video.addEventListener("loadeddata", atualizar);
        document.addEventListener("keydown", evento => { if (evento.key === "Escape" && ativa) fechar("Câmera fechada.", true); });
        document.addEventListener("visibilitychange", () => { if (document.hidden && ativa) fechar("Câmera fechada. Clique em Tirar foto para abrir novamente."); });
        window.addEventListener("pagehide", () => fechar());
        atualizar();
        return { atualizar, fechar, get ativa() { return ativa; } };
    }
};
