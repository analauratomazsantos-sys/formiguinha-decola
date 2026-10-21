"use strict";
(() => {
    const form = document.querySelector("form[data-operacao]");
    if (!form) return;
    const origem = form.dataset.operacao, chave = `formiguinha.cota.pendente.v1.${form.dataset.usuario}.${origem}`;
    const aviso = document.getElementById("operacao-pendente"), status = document.getElementById("status-operacao"), repetir = document.getElementById("retentar-operacao");
    const mensagem = form.querySelector("[data-mensagem-operacao], #mensagem-lrcash");
    const token = form.elements._csrf.value;
    let pendente = null, enviando = false, bloqueado = false;
    function estado() {
        for (const campo of form.querySelectorAll("input, select, textarea, button")) campo.disabled = !!pendente || enviando || bloqueado;
        aviso.hidden = !pendente && !bloqueado; repetir.disabled = enviando || bloqueado;
    }
    async function api(url, body) {
        const controle = new AbortController(), timer = setTimeout(() => controle.abort(), 20000);
        try {
            const r = await fetch(url, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", redirect: "error", signal: controle.signal,
                headers: { "Accept": "application/json", "Content-Type": "application/json", "X-CSRF-Token": token }, body: body ? JSON.stringify(body) : undefined });
            const dados = await r.json();
            if (!r.ok) throw Object.assign(new Error(dados.erro || "Não foi possível concluir."), { status: r.status, definitivo: dados.definitivo, conferir: dados.conferir });
            return dados;
        } finally { clearTimeout(timer); }
    }
    function concluir(recibo) {
        sessionStorage.removeItem(chave); pendente = null;
        if (typeof recibo.destino !== "string" || !/^\/(?:saldo\?|equipe\?)/.test(recibo.destino)) throw new Error("Destino inválido.");
        window.location.assign(recibo.destino);
    }
    async function enviar() {
        if (!pendente || enviando || bloqueado) return;
        enviando = true; status.textContent = "Conferindo esta mesma operação…"; estado();
        try {
            const anterior = await api(`/acessos/api/operacoes/${origem}/${pendente.id_operacao}`);
            if (anterior.recibo) { concluir(anterior.recibo); return; }
            const resposta = await api(form.getAttribute("action"), pendente); concluir(resposta.recibo);
        } catch (erro) {
            if (erro.definitivo && !erro.conferir && ![401, 403].includes(erro.status)) {
                sessionStorage.removeItem(chave); pendente = null;
                form.elements.id_operacao.value = crypto.randomUUID(); mensagem.textContent = erro.message;
            } else status.textContent = `${erro.status === 401 || erro.status === 403 ? erro.message : "A resposta não foi confirmada."} Use Consultar / tentar novamente para conferir esta mesma operação.`;
        } finally { enviando = false; estado(); }
    }
    form.addEventListener("submit", event => {
        event.preventDefault();
        if (pendente || enviando || bloqueado) return;
        mensagem.textContent = "";
        const dados = Object.fromEntries(new FormData(form)); delete dados._csrf;
        const nomeDestino = origem === "LIBERACAO" ? "funcionarioId" : "estudanteId";
        if (!dados[nomeDestino] || !dados.valor || origem === "DISTRIBUICAO" && !dados.criterio) {
            mensagem.textContent = "Escolha a pessoa, o valor e os demais campos obrigatórios.";
            document.getElementById(origem === "LIBERACAO" ? "pesquisa-funcionario" : "pesquisa-estudante")?.focus(); return;
        }
        try { sessionStorage.setItem(chave, JSON.stringify(dados)); pendente = dados; }
        catch { mensagem.textContent = "Não foi possível guardar a identificação da operação nesta aba. Confira as permissões do navegador."; return; }
        enviar();
    });
    repetir.addEventListener("click", enviar);
    try {
        const salvo = sessionStorage.getItem(chave);
        if (salvo) {
            pendente = JSON.parse(salvo);
            if (typeof pendente.id_operacao !== "string" || !/^[a-f0-9-]{36}$/i.test(pendente.id_operacao)) throw new Error();
        }
    } catch { bloqueado = true; status.textContent = "A operação anterior não pôde ser recuperada. Confira o histórico antes de usar outra aba."; }
    estado(); if (pendente) enviar();
})();
