/* Caixa administrativo. As imagens da câmera são processadas neste navegador. */
"use strict";

(() => {
    const $ = id => document.getElementById(id);
    const csrf = document.querySelector('meta[name="csrf-token"]').content;
    const calculadora = window.MercadinhoItens;
    const STORAGE = "formiguinha.mercadinho.pendente.v1";
    let aluno = null;
    let pendente = null;
    let enviando = false;
    let buscando = false;
    let abrindoCamera = false;
    let stream = null;
    let cameras = [];
    let idCameraAtual = "";
    let cicloCamera = 0;
    let frame = null;
    let ultimaLeitura = 0;
    let revisao = null;
    let recuperacaoBloqueada = false;
    let sequenciaItem = 0;
    let fotoAluno = null;
    let pesquisaCaixa = null;

    if (!calculadora || !window.FotoAluno) {
        mensagem("Não foi possível carregar o cálculo dos itens. Atualize a página.", true);
        return;
    }

    function dinheiro(valor) {
        return Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function lerCentavos(valor, zero = false) {
        const texto = String(valor).trim();
        if (!/^\d{1,7}([.,]\d{1,2})?$/.test(texto)) return null;
        const [inteiro, fracao = ""] = texto.replace(",", ".").split(".");
        const total = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
        return Number.isSafeInteger(total) && total >= (zero ? 0 : 1) ? total : null;
    }

    function decimal(valor) {
        return `${Math.floor(valor / 100)}.${String(valor % 100).padStart(2, "0")}`;
    }

    function mensagem(texto, erro = false) {
        $("mensagem").textContent = texto;
        $("mensagem").className = `mensagem${erro ? " erro" : ""}`;
        $("mensagem").hidden = !texto;
    }

    function atualizarEstado() {
        const bloqueado = !!pendente || enviando || buscando || recuperacaoBloqueada || !!fotoAluno?.ocupada;
        $("campos-movimentacao").disabled = !aluno || bloqueado;
        $("codigo-aluno").disabled = bloqueado;
        $("botao-buscar").disabled = bloqueado;
        $("abrir-camera").disabled = bloqueado || abrindoCamera;
        $("trocar-camera").disabled = bloqueado || abrindoCamera || !stream;
        $("trocar-aluno").disabled = bloqueado;
        $("proximo-aluno").disabled = bloqueado;
        $("tentar-novamente").disabled = enviando;
        fotoAluno?.atualizar(bloqueado);
        pesquisaCaixa?.atualizar();
        $("pendencia").hidden = !pendente;
        $("orientacao-movimentacao").textContent = aluno
            ? "Confira o nome antes de registrar a compra ou o crédito."
            : "Identifique o aluno para liberar o lançamento.";
    }

    async function api(caminho, body) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
            const resposta = await fetch(`/mercadinho/api/${caminho}`, {
                method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
                redirect: "error", signal: controller.signal,
                headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
                body: body === undefined ? undefined : JSON.stringify(body)
            });
            const dados = await resposta.json();
            if (!resposta.ok) {
                const erro = new Error(dados.erro || "Não foi possível concluir a solicitação.");
                erro.definitivo = dados.definitivo === true;
                erro.status = resposta.status;
                erro.saldo = dados.saldo;
                throw erro;
            }
            return dados;
        } finally { clearTimeout(timer); }
    }

    function limparAluno() {
        aluno = null;
        revisao = null;
        $("aluno-selecionado").hidden = true;
        $("nome-aluno").textContent = "";
        $("turma-aluno").textContent = "";
        $("saldo-aluno").textContent = "";
        $("form-movimentacao").reset();
        fotoAluno?.limpar();
        reiniciarItens();
        atualizarTipo();
        atualizarEstado();
    }

    async function buscar(codigo, idAluno = null) {
        if (pendente || buscando || enviando || fotoAluno?.ocupada || recuperacaoBloqueada) return;
        pararCamera();
        buscando = true;
        limparAluno();
        $("recibo").hidden = true;
        mensagem("Consultando a conta…");
        atualizarEstado();
        try {
            const resultado = idAluno === null ? await api("aluno", { codigo }) : await api("aluno-por-id", { id_aluno: idAluno });
            aluno = resultado.aluno;
            $("codigo-aluno").value = "";
            $("nome-aluno").textContent = aluno.nome;
            $("turma-aluno").textContent = aluno.turma;
            $("saldo-aluno").textContent = dinheiro(aluno.saldo);
            $("aluno-selecionado").hidden = false;
            fotoAluno?.selecionar(aluno);
            mensagem("Conta encontrada. Confira o nome e informe os itens e o valor.");
        } catch (erro) {
            mensagem(erro.message === "Failed to fetch" || erro.name === "AbortError"
                ? "Não foi possível consultar a conta. Confira a conexão e tente novamente."
                : erro.message, true);
        } finally {
            buscando = false;
            atualizarEstado();
            if (aluno) $("lista-itens").querySelector(".item-nome").focus();
        }
    }

    function lerItens() {
        return Array.from($("lista-itens").querySelectorAll(".item-compra"), linha => ({
            nome: linha.querySelector(".item-nome").value,
            quantidade: linha.querySelector(".item-quantidade").value,
            valor_unitario: linha.querySelector(".item-preco").value
        }));
    }

    function adicionarItem(focar = true) {
        const lista = $("lista-itens");
        if (lista.children.length >= calculadora.MAX_ITENS) return;
        const linha = $("modelo-item").content.firstElementChild.cloneNode(true);
        const numero = ++sequenciaItem;
        for (const campo of ["nome", "quantidade", "preco"]) {
            const input = linha.querySelector(`.item-${campo}`);
            input.id = `item-${campo}-${numero}`;
            linha.querySelector(`.rotulo-item-${campo}`).htmlFor = input.id;
        }
        lista.append(linha);
        atualizarItens();
        if (focar) linha.querySelector(".item-nome").focus();
    }

    function reiniciarItens() {
        $("lista-itens").replaceChildren();
        sequenciaItem = 0;
        adicionarItem(false);
    }

    function atualizarItens() {
        const linhas = $("lista-itens").querySelectorAll(".item-compra");
        linhas.forEach(linha => {
            let subtotal = "—";
            try {
                const total = calculadora.calcularSubtotal(linha.querySelector(".item-quantidade").value, linha.querySelector(".item-preco").value);
                subtotal = dinheiro(decimal(total));
            } catch { /* Item em preenchimento. */ }
            linha.querySelector(".item-subtotal").textContent = subtotal;
            linha.querySelector(".remover-item").disabled = linhas.length < 2;
        });
        $("adicionar-item").disabled = linhas.length >= calculadora.MAX_ITENS;
        if ($("tipo-movimentacao").value !== "SAIDA") return;
        try {
            const calculo = calculadora.calcularItens(lerItens());
            $("valor").value = dinheiro(calculo.valor).replace(/\./g, "");
            $("ajuda-itens").textContent = `${calculo.itens.length} ${calculo.itens.length === 1 ? "item informado" : "itens informados"}. Confira os subtotais e o total.`;
            $("revisar").disabled = false;
        } catch (erro) {
            $("valor").value = "";
            $("ajuda-itens").textContent = erro.message;
            $("revisar").disabled = true;
        }
        atualizarPrevisao();
    }

    function atualizarTipo(limparValor = false) {
        const compra = $("tipo-movimentacao").value === "SAIDA";
        $("itens-compra").hidden = !compra;
        $("itens-compra").disabled = !compra;
        $("grupo-descricao").hidden = compra;
        $("descricao").disabled = compra;
        $("valor").readOnly = compra;
        $("rotulo-valor").textContent = compra ? "Total da compra em LRCash" : "Valor do crédito em LRCash";
        $("ajuda-valor").textContent = compra ? "Total calculado automaticamente pela soma dos itens." : "Use até duas casas decimais. Exemplo: 7,50.";
        $("revisar").textContent = compra ? "Conferir compra" : "Conferir crédito";
        if (compra) atualizarItens();
        else {
            if (limparValor) $("valor").value = "";
            $("revisar").disabled = false;
            atualizarPrevisao();
        }
    }

    function atualizarPrevisao() {
        const valor = lerCentavos($("valor").value);
        const saldo = aluno ? lerCentavos(aluno.saldo, true) : null;
        const compra = $("tipo-movimentacao").value === "SAIDA";
        $("previsao").className = "previsao";
        if (valor === null || saldo === null) {
            $("previsao").textContent = compra ? "Preencha os itens para calcular o total da compra." : "Informe o valor do crédito.";
        } else if (valor > 99999999) {
            $("previsao").textContent = "O valor máximo por operação é 999.999,99 LRCash.";
            $("previsao").classList.add("erro");
        } else if (compra && valor > saldo) {
            $("previsao").textContent = "Saldo insuficiente para esta compra.";
            $("previsao").classList.add("erro");
        } else {
            const novo = saldo + (compra ? -valor : valor);
            $("previsao").textContent = `Saldo após ${compra ? "a compra" : "o crédito"}: ${dinheiro(decimal(novo))} LRCash`;
        }
    }

    function novoId() {
        const dados = crypto.getRandomValues(new Uint8Array(16));
        dados[6] = (dados[6] & 15) | 64;
        dados[8] = (dados[8] & 63) | 128;
        const hex = Array.from(dados, x => x.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    function mostrarRecibo(recibo) {
        // Apagar a pendência antes de liberar outra compra. Mesmo se o
        // armazenamento falhar, a chave antiga só permite recuperar este recibo.
        try { sessionStorage.removeItem(STORAGE); } catch { /* manter bloqueio por chave no servidor */ }
        pendente = null;
        limparAluno();
        $("titulo-recibo").textContent = recibo.tipo === "SAIDA" ? "Compra registrada" : "Crédito registrado";
        $("recibo-aluno").textContent = `${recibo.nome} · ${recibo.turma}`;
        $("recibo-descricao").textContent = recibo.descricao;
        $("recibo-valor").textContent = `${recibo.tipo === "SAIDA" ? "−" : "+"}${dinheiro(recibo.valor)} LRCash`;
        $("recibo-anterior").textContent = `${dinheiro(recibo.saldo_anterior)} LRCash`;
        $("recibo-posterior").textContent = `${dinheiro(recibo.saldo_posterior)} LRCash`;
        $("recibo-referencia").textContent = `Comprovante nº ${recibo.id_movimentacao}`;
        $("recibo").hidden = false;
        mensagem(recibo.repetida ? "Esta operação já estava registrada. O mesmo comprovante foi recuperado." : "Operação concluída com sucesso.");
        $("recibo").focus();
    }

    async function enviarPendente() {
        if (!pendente || enviando) return;
        enviando = true;
        pararCamera();
        atualizarEstado();
        mensagem("Conferindo a operação no banco…");
        try {
            // Recuperar primeiro ajuda a resolver respostas perdidas ou uma
            // recarga da página sem depender de a identificação ainda ser válida.
            const anterior = await api(`recibos/${encodeURIComponent(pendente.id_operacao)}`);
            if (anterior.recibo) { mostrarRecibo(anterior.recibo); return; }
            const resultado = await api("movimentacoes", pendente);
            mostrarRecibo(resultado.recibo);
        } catch (erro) {
            if (erro.definitivo && erro.status !== 401 && erro.status !== 403) {
                try { sessionStorage.removeItem(STORAGE); } catch { /* chave continua segura no banco */ }
                pendente = null;
                if (aluno && erro.saldo !== undefined) {
                    aluno.saldo = erro.saldo;
                    $("saldo-aluno").textContent = dinheiro(aluno.saldo);
                    atualizarPrevisao();
                }
                mensagem(erro.message, true);
            } else {
                mensagem(erro.status === 401 || erro.status === 403
                    ? "Entre novamente no painel e reabra o caixa para conferir esta operação."
                    : "A resposta não foi confirmada. Use Consultar / tentar novamente para conferir a mesma operação.", true);
            }
        } finally {
            enviando = false;
            atualizarEstado();
        }
    }

    function pararCamera() {
        cicloCamera += 1;
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        if (stream) stream.getTracks().forEach(track => track.stop());
        stream = null;
        cameras = [];
        idCameraAtual = "";
        $("video-qr").srcObject = null;
        $("area-camera").hidden = true;
        $("trocar-camera").hidden = true;
        $("parar-camera").hidden = true;
    }

    async function listarCameras(ciclo) {
        try {
            if (!navigator.mediaDevices.enumerateDevices) return;
            const dispositivos = await navigator.mediaDevices.enumerateDevices();
            if (ciclo !== cicloCamera || !stream) return;
            cameras = dispositivos.filter((dispositivo, indice, lista) =>
                dispositivo.kind === "videoinput" && dispositivo.deviceId &&
                lista.findIndex(item => item.kind === "videoinput" && item.deviceId === dispositivo.deviceId) === indice);
            $("trocar-camera").hidden = cameras.length < 2;
            atualizarEstado();
        } catch { /* A leitura continua mesmo quando o navegador não informa outras câmeras. */ }
    }

    async function trocarCamera() {
        if (pendente || enviando || buscando || fotoAluno?.ocupada || abrindoCamera || !stream || cameras.length < 2) return;
        const indice = cameras.findIndex(camera => camera.deviceId === idCameraAtual);
        const proxima = cameras[(indice + 1) % cameras.length];
        const lado = stream.getVideoTracks()[0]?.getSettings?.().facingMode;
        const dispositivo = { deviceId: { exact: proxima.deviceId } };
        const preferencia = lado === "environment" ? { facingMode: { exact: "user" } }
            : lado === "user" ? { facingMode: { exact: "environment" } } : dispositivo;
        // Libera a câmera atual antes de pedir a outra, inclusive em celulares.
        pararCamera();
        await abrirCamera(preferencia, dispositivo);
    }

    async function abrirCamera(configuracaoVideo = { facingMode: { ideal: "environment" } }, alternativa = null) {
        if (pendente || enviando || buscando || fotoAluno?.ocupada || stream || abrindoCamera) return;
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            mensagem("A câmera precisa de uma conexão HTTPS. Use o endereço publicado do sistema ou digite o código.", true);
            return;
        }
        if (typeof window.jsQR !== "function") {
            mensagem("O leitor de QR não foi carregado. Atualize a página ou digite o código.", true);
            return;
        }
        abrindoCamera = true;
        const ciclo = ++cicloCamera;
        $("parar-camera").hidden = false;
        atualizarEstado();
        try {
            let novaStream;
            try {
                novaStream = await navigator.mediaDevices.getUserMedia({ video: configuracaoVideo, audio: false });
            } catch (erro) {
                if (!alternativa || ciclo !== cicloCamera || !["OverconstrainedError", "NotFoundError"].includes(erro.name)) throw erro;
                novaStream = await navigator.mediaDevices.getUserMedia({ video: alternativa, audio: false });
            }
            if (ciclo !== cicloCamera || pendente || buscando || document.hidden) {
                novaStream.getTracks().forEach(track => track.stop());
                return;
            }
            stream = novaStream;
            idCameraAtual = stream.getVideoTracks()[0]?.getSettings?.().deviceId || "";
            $("video-qr").srcObject = stream;
            $("area-camera").hidden = false;
            $("parar-camera").hidden = false;
            await $("video-qr").play();
            if (ciclo !== cicloCamera || !stream) return;
            listarCameras(ciclo);
            mensagem("Aponte a câmera para o QR Code do cartão.");
            const canvas = $("canvas-qr");
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            const video = $("video-qr");
            function ler(agora) {
                if (!stream || ciclo !== cicloCamera) return;
                try {
                    if (video.readyState >= 2 && video.videoWidth && agora - ultimaLeitura > 140) {
                        ultimaLeitura = agora;
                        const escala = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
                        canvas.width = Math.max(1, Math.round(video.videoWidth * escala));
                        canvas.height = Math.max(1, Math.round(video.videoHeight * escala));
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const qr = window.jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
                        if (qr?.data) { pararCamera(); buscar(qr.data); return; }
                    }
                    frame = requestAnimationFrame(ler);
                } catch {
                    pararCamera();
                    mensagem("Não foi possível ler a imagem. Tente novamente ou digite o código.", true);
                }
            }
            frame = requestAnimationFrame(ler);
        } catch (erro) {
            if (ciclo !== cicloCamera) return;
            pararCamera();
            mensagem(erro.name === "NotAllowedError"
                ? "Permita o uso da câmera no navegador ou digite o código do aluno."
                : "Não foi possível abrir a câmera. Confira se ela está disponível ou digite o código.", true);
        } finally { abrindoCamera = false; atualizarEstado(); }
    }

    $("buscar-aluno").addEventListener("submit", event => { event.preventDefault(); buscar($("codigo-aluno").value); });
    $("tipo-movimentacao").addEventListener("change", () => atualizarTipo(true));
    $("lista-itens").addEventListener("input", atualizarItens);
    $("adicionar-item").addEventListener("click", () => {
        if (!aluno || pendente || enviando || buscando || fotoAluno?.ocupada || recuperacaoBloqueada) return;
        adicionarItem();
    });
    $("lista-itens").addEventListener("click", event => {
        const botao = event.target.closest(".remover-item");
        if (!botao || !aluno || pendente || enviando || buscando || fotoAluno?.ocupada || recuperacaoBloqueada || $("lista-itens").children.length < 2) return;
        botao.closest(".item-compra").remove();
        atualizarItens();
    });
    $("valor").addEventListener("input", atualizarPrevisao);
    $("trocar-aluno").addEventListener("click", () => {
        if (pendente || enviando || fotoAluno?.ocupada) return;
        limparAluno(); mensagem(""); $("codigo-aluno").focus();
    });
    $("form-movimentacao").addEventListener("submit", event => {
        event.preventDefault();
        if (!aluno || pendente || enviando || buscando || fotoAluno?.ocupada) return;
        const compra = $("tipo-movimentacao").value === "SAIDA";
        let calculo = null;
        if (compra) {
            try { calculo = calculadora.calcularItens(lerItens()); }
            catch (erro) { mensagem(erro.message, true); return; }
        }
        const valor = compra ? calculo.centavos : lerCentavos($("valor").value);
        const descricao = compra ? calculo.descricao : $("descricao").value.trim();
        const saldo = lerCentavos(aluno.saldo, true);
        if (valor === null || valor > 99999999) { mensagem("Informe um valor positivo com até duas casas decimais.", true); return; }
        if (descricao.length < 3 || descricao.length > 200 || /[\u0000-\u001f\u007f]/.test(descricao)) {
            mensagem("Descreva os itens ou o motivo em uma única linha, com 3 a 200 caracteres.", true); return;
        }
        if (compra && valor > saldo) { mensagem("Saldo insuficiente para esta compra.", true); return; }
        revisao = { id_operacao: novoId(), identificacao: aluno.identificacao, tipo: compra ? "SAIDA" : "ENTRADA",
            valor: decimal(valor), descricao, saldo_esperado: aluno.saldo };
        if (compra) revisao.itens = calculo.itens;
        $("titulo-confirmacao").textContent = compra ? "Confirmar compra" : "Confirmar crédito";
        $("confirmacao-aluno").textContent = `${aluno.nome} · ${aluno.turma}`;
        $("confirmacao-descricao").textContent = descricao;
        $("confirmacao-valor").textContent = `${compra ? "Retirar" : "Adicionar"} ${dinheiro(decimal(valor))} LRCash`;
        $("confirmacao-saldo").textContent = `Saldo após a operação: ${dinheiro(decimal(saldo + (compra ? -valor : valor)))} LRCash`;
        $("confirmar").textContent = compra ? "Confirmar compra" : "Confirmar crédito";
        $("confirmacao").showModal();
        $("cancelar-confirmacao").focus();
    });
    $("cancelar-confirmacao").addEventListener("click", () => { revisao = null; $("confirmacao").close(); });
    $("confirmacao").addEventListener("cancel", () => { revisao = null; });
    $("confirmar").addEventListener("click", () => {
        if (!revisao || pendente || enviando || fotoAluno?.ocupada) return;
        try { sessionStorage.setItem(STORAGE, JSON.stringify(revisao)); }
        catch { mensagem("Não foi possível preparar a confirmação. Verifique se o navegador permite armazenamento e tente novamente.", true); $("confirmacao").close(); return; }
        pendente = revisao;
        revisao = null;
        $("confirmacao").close();
        enviarPendente();
    });
    $("tentar-novamente").addEventListener("click", enviarPendente);
    $("proximo-aluno").addEventListener("click", () => {
        if (pendente || enviando || fotoAluno?.ocupada) return;
        limparAluno(); $("recibo").hidden = true; mensagem(""); $("codigo-aluno").focus();
    });
    $("abrir-camera").addEventListener("click", () => abrirCamera());
    $("trocar-camera").addEventListener("click", trocarCamera);
    $("parar-camera").addEventListener("click", pararCamera);
    window.addEventListener("pagehide", pararCamera);
    document.addEventListener("visibilitychange", () => { if (document.hidden) pararCamera(); });

    // O caixa apenas consulta a foto. O cadastro fica na gestão administrativa.
    fotoAluno = window.FotoAluno.criar();
    if (window.PesquisaCadastros && $("pesquisa-estudante-caixa")) {
        pesquisaCaixa = window.PesquisaCadastros.criarBuscaCaixa({
            elemento: $("pesquisa-estudante-caixa"),
            podeSelecionar: () => !pendente && !enviando && !buscando && !recuperacaoBloqueada && !fotoAluno.ocupada,
            aoSelecionar: id => buscar(null, id)
        });
    }
    window.addEventListener("pageshow", event => {
        if (event.persisted && aluno) fotoAluno.selecionar(aluno);
    });

    try {
        const anterior = sessionStorage.getItem(STORAGE);
        if (anterior) {
            const dados = JSON.parse(anterior);
            if (typeof dados.id_operacao !== "string" || !/^[0-9a-f-]{36}$/i.test(dados.id_operacao)) throw new Error();
            pendente = dados;
        }
    } catch {
        recuperacaoBloqueada = true;
        mensagem("Não foi possível recuperar a operação anterior. Confira o extrato e feche esta aba antes de iniciar uma nova cobrança.", true);
    }
    reiniciarItens();
    atualizarTipo();
    atualizarEstado();
    if (pendente) enviarPendente();
})();
