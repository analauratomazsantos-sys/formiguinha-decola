"use strict";

((global, criar) => {
    const api = criar();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (global?.document) {
        global.PesquisaCadastros = api;
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", api.iniciar);
        else api.iniciar();
    }
})(typeof window !== "undefined" ? window : null, () => {
    const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR").replace(/[ºª°]/g, " ").replace(/([0-9])([a-z])/g, "$1 $2")
        .replace(/([a-z])([0-9])/g, "$1 $2").replace(/[^a-z0-9]+/g, " ").trim();
    function dados(nome, turma = "", geral = false) {
        const classe = normalizar(turma), palavras = classe.split(" ");
        return { nome: normalizar(nome), turma: classe, ano: palavras.find(p => /^\d{1,2}$/.test(p)) || "",
            letra: palavras.filter(p => /^[a-z]$/.test(p)).at(-1) || "", geral };
    }
    function corresponde(item, busca) {
        let consulta = normalizar(busca);
        if (!consulta) return true;
        if (item.geral) return consulta.split(" ").every(t => item.nome.includes(t));
        let turmaCorreta = true;
        consulta = consulta.replace(/\b(\d{1,2})\s*(?:(?:ano|serie)\s*)?([a-z])\b/g, (_, ano, letra) => {
            turmaCorreta = turmaCorreta && item.ano === ano && item.letra === letra; return " ";
        }).replace(/\bturma\s+([a-z])\b/g, (_, letra) => { turmaCorreta = turmaCorreta && item.letra === letra; return " "; });
        if (!turmaCorreta) return false;
        return consulta.split(/\s+/).filter(t => t && !["ano", "anos", "serie", "series", "turma", "turmas"].includes(t))
            .every(t => /^\d+$/.test(t) ? item.ano === t : item.nome.includes(t) || item.turma.includes(t));
    }
    function elemento(tag, classe, texto) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (texto !== undefined) el.textContent = texto;
        return el;
    }
    function barra({ id, rotulo, placeholder, entrada, contador }) {
        const raiz = elemento("div", "pesquisa-cadastros");
        const campo = entrada || elemento("input");
        campo.type = "search"; campo.id = id; campo.maxLength = 120; campo.autocomplete = "off"; campo.placeholder = placeholder;
        const label = entrada ? document.querySelector(`label[for="${id}"]`) : null;
        const titulo = label || elemento("label", "", rotulo);
        titulo.htmlFor = id; titulo.textContent = rotulo;
        if (entrada) (label || entrada).before(raiz);
        const linha = elemento("div", "linha-pesquisa-cadastros");
        const limpar = elemento("button", "secundario limpar-pesquisa", "Limpar"); limpar.type = "button";
        const retorno = contador || elemento("p");
        retorno.id = contador?.id || `${id}-resultado`; retorno.classList.add("retorno-pesquisa");
        retorno.setAttribute("role", "status"); retorno.setAttribute("aria-live", "polite");
        campo.setAttribute("aria-describedby", retorno.id);
        linha.append(campo, limpar); raiz.append(titulo, linha, retorno);
        let aoFiltrar = () => {};
        const atualizar = () => { limpar.disabled = campo.disabled || !campo.value; aoFiltrar(); };
        campo.addEventListener("input", atualizar);
        campo.addEventListener("keydown", event => {
            if (event.key === "Enter") event.preventDefault();
            if (event.key === "Escape") { event.preventDefault(); campo.value = ""; atualizar(); }
        });
        limpar.addEventListener("click", () => { if (!campo.disabled) { campo.value = ""; atualizar(); campo.focus(); } });
        limpar.disabled = !campo.value;
        return { raiz, campo, limpar, retorno, aoFiltrar(fn) { aoFiltrar = fn; }, atualizar };
    }
    function lista({ controles, itens, vazio, mais, unidade = "estudantes" }) {
        let limite = 50;
        const atualizar = () => {
            let quantidade = 0, exibidos = 0;
            for (const item of itens) {
                const encontrado = corresponde(item.dados, controles.campo.value);
                if (encontrado) quantidade++;
                item.el.hidden = !encontrado || exibidos >= limite;
                if (!item.el.hidden) exibidos++;
            }
            controles.retorno.textContent = `Mostrando ${exibidos} de ${quantidade} ${unidade} encontrados.`;
            vazio.hidden = quantidade !== 0;
            mais.hidden = quantidade <= exibidos;
        };
        controles.aoFiltrar(() => { limite = 50; atualizar(); });
        mais.addEventListener("click", () => { limite += 50; atualizar(); });
        atualizar();
    }
    function listaExistente(tipo) {
        const entrada = document.getElementById(`filtro-${tipo}`);
        if (!entrada) return;
        const sufixo = tipo === "fotos" ? "estudante-foto" : "folhapay";
        const controles = barra({ id: entrada.id, entrada, contador: document.getElementById(`quantidade-${tipo}`),
            rotulo: "Pesquisar por nome, turma ou ano/série", placeholder: "Ex.: Ana, 7A ou 7º ano A" });
        const itens = Array.from(document.querySelectorAll(`.linha-${sufixo}`), el => ({ el,
            dados: dados(el.querySelector("strong").textContent, el.querySelector("small").textContent) }));
        lista({ controles, itens, vazio: document.getElementById(`${tipo}-sem-resultados`), mais: document.getElementById(`mais-${tipo}`) });
    }
    function tabela(tabela, estudantes) {
        const corpo = tabela.tBodies[0];
        if (!corpo) return;
        const linhas = Array.from(corpo.rows).filter(linha => linha.cells.length > 1);
        const controles = barra({ id: estudantes ? "pesquisa-lista-estudantes" : "pesquisa-extrato", rotulo: estudantes ? "Pesquisar estudantes" : "Pesquisar neste extrato",
            placeholder: estudantes ? "Nome, turma ou ano/série" : "Data, tipo, critério, valor ou responsável" });
        const recipiente = tabela.closest(".tabela-container") || tabela;
        recipiente.before(controles.raiz);
        let vazio = Array.from(corpo.rows).find(linha => linha.cells.length === 1);
        if (!vazio) { vazio = elemento("tr"); const celula = elemento("td", "estado-vazio", "Nenhum resultado encontrado para esta pesquisa."); celula.colSpan = tabela.tHead?.rows[0].cells.length || 4; vazio.append(celula); corpo.append(vazio); }
        const mais = elemento("button", "secundario mais-pesquisa", "Mostrar mais resultados"); mais.type = "button"; recipiente.after(mais);
        const itens = linhas.map(el => ({ el, dados: estudantes ? dados(el.cells[0].textContent, el.cells[2].textContent) : dados(el.textContent, "", true) }));
        lista({ controles, itens, vazio, mais, unidade: estudantes ? "estudantes" : "registros" });
    }
    async function consultar(caminho) {
        const controle = new AbortController(), timer = setTimeout(() => controle.abort(), 15000);
        try {
            const resposta = await fetch(`/cadastros/pesquisa/${caminho}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: controle.signal });
            const resultado = await resposta.json();
            if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível carregar a pesquisa.");
            return resultado;
        } finally { clearTimeout(timer); }
    }
    function seletorEstudante(select) {
        if (select.classList.contains("seletor-estudante-original")) return;
        const funcionario = select.name === "funcionarioId";
        const termo = funcionario ? "funcionário" : "estudante", plural = funcionario ? "funcionários" : "estudantes";
        const opcoes = Array.from(select.options).filter(o => o.value).map(o => {
            const partes = o.textContent.split(/\s+[—–]\s+/);
            return { valor: o.value, texto: o.textContent.trim(), nome: partes[0].trim(), turma: partes.slice(1).join(" ").trim(),
                dados: funcionario ? dados(o.textContent, "", true) : dados(partes[0], partes.slice(1).join(" ")) };
        });
        const raiz = elemento("div", "seletor-estudante-pesquisavel");
        const linha = elemento("div", "linha-seletor-estudante");
        const campo = elemento("input");
        campo.id = `pesquisa-${select.id}`; campo.type = "text"; campo.autocomplete = "off";
        campo.maxLength = 250; campo.placeholder = funcionario ? "Digite o nome ou o cargo" : "Digite o nome, a turma ou o ano/série";
        campo.setAttribute("role", "combobox"); campo.setAttribute("aria-autocomplete", "list");
        campo.setAttribute("aria-expanded", "false"); campo.setAttribute("aria-required", String(select.required));
        const limpar = elemento("button", "secundario limpar-seletor-estudante", "Limpar"); limpar.type = "button";
        limpar.setAttribute("aria-label", `Limpar ${termo} e pesquisa`);
        const abrirLista = elemento("button", "secundario abrir-seletor-estudante"); abrirLista.type = "button"; abrirLista.title = `Mostrar ${plural}`;
        abrirLista.setAttribute("aria-label", `Mostrar ${plural}`); abrirLista.setAttribute("aria-expanded", "false");
        const lista = elemento("ul", "opcoes-seletor-estudante"); lista.id = `${campo.id}-opcoes`; lista.hidden = true;
        lista.setAttribute("role", "listbox"); lista.setAttribute("aria-label", `${plural} encontrados`);
        campo.setAttribute("aria-controls", lista.id); abrirLista.setAttribute("aria-controls", lista.id);
        const retorno = elemento("p", "retorno-seletor-estudante"); retorno.id = `${campo.id}-resultado`;
        retorno.setAttribute("role", "status"); retorno.setAttribute("aria-live", "polite");
        campo.setAttribute("aria-describedby", retorno.id);
        const erro = document.getElementById(`erro-${select.id}`);
        if (erro) campo.setAttribute("aria-describedby", `${retorno.id} ${erro.id}`);
        linha.append(campo, limpar, abrirLista); raiz.append(linha, lista, retorno); select.before(raiz);
        const label = Array.from(document.querySelectorAll("label")).find(l => l.htmlFor === select.id);
        if (label) label.htmlFor = campo.id;
        else { const titulo = elemento("label", "", funcionario ? "Funcionário" : "Estudante"); titulo.htmlFor = campo.id; raiz.before(titulo); }
        let encontrados = [], ativo = -1, interno = false;
        const selecionado = () => opcoes.find(o => o.valor === select.value);
        function definir(valor) {
            if (select.value === valor) return;
            select.value = valor; interno = true;
            try { select.dispatchEvent(new Event("change", { bubbles: true })); }
            finally { interno = false; }
        }
        function fechar() {
            lista.hidden = true; ativo = -1; campo.removeAttribute("aria-activedescendant");
            campo.setAttribute("aria-expanded", "false"); abrirLista.setAttribute("aria-expanded", "false");
        }
        function sincronizar() {
            const atual = selecionado(); campo.value = atual?.texto || "";
            campo.disabled = select.disabled; abrirLista.disabled = select.disabled;
            limpar.disabled = select.disabled || !campo.value;
            retorno.textContent = atual ? `${funcionario ? "Funcionário" : "Estudante"} selecionado.` : funcionario ? "Pesquise por nome ou cargo e escolha um resultado." : "Pesquise por nome, turma ou ano/série e escolha um resultado.";
            campo.setAttribute("aria-invalid", "false"); fechar();
        }
        function escolher(opcao) {
            if (select.disabled) return;
            definir(opcao.valor); sincronizar(); campo.focus();
        }
        function abrir() {
            if (select.disabled) return;
            const atual = selecionado(), busca = atual && campo.value === atual.texto ? "" : campo.value;
            encontrados = opcoes.filter(o => corresponde(o.dados, busca)); ativo = -1;
            campo.removeAttribute("aria-activedescendant"); lista.replaceChildren();
            encontrados.forEach((opcao, indice) => {
                const item = elemento("li", "opcao-seletor-estudante");
                item.id = `${lista.id}-${indice}`; item.setAttribute("role", "option");
                item.setAttribute("aria-selected", String(select.value === opcao.valor));
                item.append(elemento("strong", "", opcao.nome), elemento("small", "", opcao.turma || (funcionario ? "Cargo não informado" : "Turma não informada")));
                item.addEventListener("pointerdown", event => event.preventDefault());
                item.addEventListener("click", () => escolher(opcao)); lista.append(item);
            });
            if (!encontrados.length) {
                const vazio = elemento("li", "vazio-seletor-estudante", `Nenhum ${termo} encontrado.`);
                vazio.setAttribute("role", "presentation"); lista.append(vazio);
            }
            lista.hidden = false; campo.setAttribute("aria-expanded", "true"); abrirLista.setAttribute("aria-expanded", "true");
            retorno.textContent = encontrados.length ? `${encontrados.length} ${encontrados.length === 1 ? `${termo} encontrado` : `${plural} encontrados`}. Escolha na lista.` : `Nenhum ${termo} corresponde à pesquisa.`;
        }
        function mover(direcao) {
            if (lista.hidden) abrir();
            if (!encontrados.length) return;
            ativo = ativo < 0 ? (direcao > 0 ? 0 : encontrados.length - 1) : (ativo + direcao + encontrados.length) % encontrados.length;
            Array.from(lista.children).forEach((item, indice) => item.classList.toggle("opcao-ativa", indice === ativo));
            const item = lista.children[ativo]; campo.setAttribute("aria-activedescendant", item.id); item.scrollIntoView({ block: "nearest" });
        }
        campo.addEventListener("input", () => {
            definir(""); campo.setAttribute("aria-invalid", "false"); limpar.disabled = !campo.value; abrir();
        });
        campo.addEventListener("click", abrir);
        campo.addEventListener("keydown", event => {
            if (event.isComposing) return;
            if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) event.preventDefault();
            if (event.key === "ArrowDown") mover(1);
            if (event.key === "ArrowUp") mover(-1);
            if (event.key === "Enter") {
                if (!lista.hidden && ativo >= 0) escolher(encontrados[ativo]);
                else { abrir(); retorno.textContent = `Escolha um ${termo} na lista para confirmar a seleção.`; }
            }
            if (event.key === "Escape" || event.key === "Tab") fechar();
        });
        limpar.addEventListener("click", () => { if (!select.disabled) { definir(""); campo.value = ""; limpar.disabled = true; campo.setAttribute("aria-invalid", "false"); campo.focus(); abrir(); } });
        abrirLista.addEventListener("click", () => { const aberta = !lista.hidden; campo.focus(); if (aberta) fechar(); else abrir(); });
        raiz.addEventListener("focusout", event => { if (!raiz.contains(event.relatedTarget)) fechar(); });
        document.addEventListener("pointerdown", event => { if (!raiz.contains(event.target)) fechar(); });
        select.addEventListener("change", () => { if (!interno) sincronizar(); });
        select.addEventListener("invalid", event => { event.preventDefault(); campo.setAttribute("aria-invalid", "true"); campo.focus(); abrir(); });
        select.form?.addEventListener("reset", () => queueMicrotask(sincronizar));
        select.form?.addEventListener("submit", event => {
            if (select.required && !select.disabled && !select.value) {
                event.preventDefault(); campo.setAttribute("aria-invalid", "true"); campo.focus(); abrir();
                retorno.textContent = `Escolha um ${termo} na lista antes de continuar.`;
            }
        });
        // O campo original conserva id, name, opções e valor para os formulários existentes.
        select.classList.add("seletor-estudante-original"); select.hidden = true; select.setAttribute("aria-hidden", "true");
        sincronizar();
    }
    async function carregarTurmas(select) {
        try {
            const resultado = await consultar("turmas");
            if (!Array.isArray(resultado.turmas)) return;
            const anterior = select.value;
            const padrao = Array.from(select.options).find(o => !o.value) || new Option("Selecione uma turma", "");
            const opcoes = resultado.turmas.map(t => new Option(t.nome_turma, t.nome_turma));
            select.replaceChildren(padrao, ...opcoes); select.value = opcoes.some(o => o.value === anterior) ? anterior : "";
            if (anterior && select.value !== anterior) select.dispatchEvent(new Event("change", { bubbles: true }));
        } catch { /* Mantém a seleção de turma original se a consulta não estiver disponível. */ }
    }
    function extratoAluno() {
        const raiz = document.querySelector(".carteira .extrato");
        if (!raiz) return;
        const linhas = Array.from(raiz.querySelectorAll(".movimento"));
        if (!linhas.length) return;
        const controles = barra({ id: "pesquisa-meu-extrato", rotulo: "Pesquisar no meu extrato", placeholder: "Data, critério, descrição ou valor" });
        raiz.querySelector("h2").after(controles.raiz);
        const vazio = elemento("p", "sem-movimentos", "Nenhuma movimentação corresponde à pesquisa."); raiz.append(vazio);
        const mais = elemento("button", "secundario mais-pesquisa", "Mostrar mais movimentações"); mais.type = "button"; raiz.append(mais);
        lista({ controles, itens: linhas.map(el => ({ el, dados: dados(el.textContent, "", true) })), vazio, mais, unidade: "movimentações" });
    }
    function criarBuscaCaixa({ elemento: raiz, podeSelecionar, aoSelecionar }) {
        const controles = barra({ id: "pesquisa-caixa", rotulo: "Pesquisar estudante por nome, turma ou ano/série", placeholder: "Ex.: Ana, 7A ou 7º ano" });
        const resultados = elemento("ul", "resultados-pesquisa-caixa");
        raiz.append(controles.raiz, resultados);
        let estudantes = null, carregando = null;
        function atualizar() {
            const bloqueado = !podeSelecionar(); controles.campo.disabled = bloqueado;
            controles.limpar.disabled = bloqueado || !controles.campo.value;
            resultados.querySelectorAll("button").forEach(botao => { botao.disabled = bloqueado; });
        }
        function mostrar() {
            resultados.replaceChildren();
            if (!controles.campo.value.trim()) { controles.retorno.textContent = "Digite para localizar o estudante e selecione o cadastro correto."; atualizar(); return; }
            if (!estudantes) return;
            const encontrados = estudantes.filter(a => corresponde(a.dados, controles.campo.value));
            controles.retorno.textContent = encontrados.length ? `Mostrando ${Math.min(20, encontrados.length)} de ${encontrados.length} estudantes. Confira o nome e a turma antes de selecionar.` : "Nenhum estudante encontrado.";
            encontrados.slice(0, 20).forEach(aluno => {
                const item = elemento("li"), botao = elemento("button", "secundario selecionar-pesquisa"); botao.type = "button";
                botao.append(elemento("strong", "", aluno.nome), elemento("span", "", `${aluno.turma || "Turma não informada"} · Selecionar`));
                botao.addEventListener("click", () => {
                    if (!podeSelecionar()) return;
                    controles.campo.value = ""; resultados.replaceChildren(); controles.retorno.textContent = "Consultando o estudante selecionado…";
                    Promise.resolve(aoSelecionar(aluno.id_aluno)).finally(mostrar); atualizar();
                });
                item.append(botao); resultados.append(item);
            });
            atualizar();
        }
        async function pesquisar() {
            if (!podeSelecionar()) return;
            if (!controles.campo.value.trim()) { mostrar(); return; }
            if (estudantes) { mostrar(); return; }
            controles.retorno.textContent = "Carregando estudantes…";
            try {
                if (!carregando) carregando = consultar("estudantes").then(resultado => {
                    if (!Array.isArray(resultado.estudantes)) throw new Error("Lista indisponível.");
                    estudantes = resultado.estudantes.map(a => ({ ...a, dados: dados(a.nome, a.turma) }));
                }).finally(() => { carregando = null; });
                await carregando; mostrar();
            } catch { controles.retorno.textContent = "Não foi possível carregar os estudantes. Confira a sessão e tente pesquisar novamente."; }
        }
        controles.aoFiltrar(pesquisar); mostrar();
        return { atualizar };
    }
    function iniciar() {
        listaExistente("fotos"); listaExistente("folhapay");
        document.querySelectorAll('select[name="estudanteId"], select[name="funcionarioId"]').forEach(seletorEstudante);
        document.querySelectorAll('select[name="turma"]').forEach(carregarTurmas);
        if (document.body.dataset.modulo === "estudantes") document.querySelectorAll(".tabela-estudantes").forEach(t => tabela(t, true));
        if (document.body.dataset.modulo === "extrato") document.querySelectorAll(".tabela-estudantes").forEach(t => tabela(t, false));
        extratoAluno();
    }
    return { normalizar, dados, corresponde, iniciar, criarBuscaCaixa };
});
