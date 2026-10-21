"use strict";

// Banco em memória EXCLUSIVO DOS TESTES: nenhum acesso ao Railway.
function criarBancoFalso() {
    const state = {
        contas: new Map([[10, { id_conta: 10, id_aluno: 1, nome: "Estudante de teste", turma: "Turma teste", saldo: "20.00", status: 1, codigo: "ABC123", qr: "a".repeat(64) }],
            [20, { id_conta: 20, id_aluno: 2, nome: "Estudante sem RA", turma: "Outra turma", saldo: "7.00", status: 1, codigo: "DEF456", qr: "b".repeat(48) }]]),
        operacoes: new Map(), fotos: new Map(), alunosSemConta: [], movimentos: [], proximo: 1, falhar: null, semCriterio: false, semTabelaFotos: false,
        usuarios: new Map([[5, { id_usuario: 5, nome: "Administrador fictício", email: "teste@formiguinha.local", ativo: 1, perfil: "ADMIN", codigo_acesso: null, cargos: "", trocar_senha: 0, versao_sessao: 1, saldo_cota: "0.00" }],
            [6, { id_usuario: 6, nome: "Professora fictícia", email: "abc999", ativo: 1, ativo_legado: 0, habilitado: 1, perfil: "FUNCIONARIO", codigo_acesso: "ABC999", cargos: "Professora", trocar_senha: 0, versao_sessao: 1, saldo_cota: "0.00" }]]), cotas: new Map()
    };
    const filas = new Map();
    async function lock(chave) {
        const anterior = filas.get(chave) || Promise.resolve();
        let liberar;
        const atual = new Promise(resolve => { liberar = resolve; });
        filas.set(chave, atual);
        await anterior;
        return () => { liberar(); if (filas.get(chave) === atual) filas.delete(chave); };
    }
    const compacto = sql => sql.replace(/\s+/g, " ").trim();
    function lerRecibo(op) {
        if (!op) return [];
        const conta = state.contas.get(op.id_conta);
        return conta ? [{ ...op, nome: conta.nome, turma: conta.turma }] : [];
    }
    function reciboCota(op) {
        if (!op) return [];
        const conta = [...state.contas.values()].find(c => c.id_aluno === op.id_aluno);
        return [{ ...op, nome_aluno: conta?.nome || null, turma: conta?.turma || null,
            nome_funcionario: state.usuarios.get(op.id_funcionario)?.nome || null, nome_operador: state.usuarios.get(op.id_operador)?.nome || null }];
    }
    async function ler(sqlBruto, parametros) {
        const sql = compacto(sqlBruto);
        if (sql.includes("FROM usuario u")) {
            let rows = [...state.usuarios.values()];
            if (sql.includes("WHERE u.email = ?")) rows = rows.filter(u => u.email === parametros[0]);
            else if (sql.includes("WHERE u.id_usuario = ?")) rows = rows.filter(u => u.id_usuario === Number(parametros[0]));
            else if (sql.includes("WHERE a.perfil = 'FUNCIONARIO'")) rows = rows.filter(u => u.perfil === "FUNCIONARIO");
            return [rows.map(u => ({ ...u }))];
        }
        if (sql.includes("FROM cota_operacao o")) {
            if (sql.includes("WHERE o.origem = ?")) {
                const op = state.cotas.get(`${parametros[0]}:${parametros[1]}`);
                return [op?.id_operador === parametros[2] ? reciboCota(op) : []];
            }
            return [[...state.cotas.values()].filter(o => !sql.includes("o.id_funcionario = ?") || o.id_funcionario === parametros[0] || o.id_operador === parametros[1]).flatMap(reciboCota)];
        }
        if (sql.includes("FROM turma ORDER BY")) {
            return [[{ id_turma: 1, nome_turma: "6A" }, { id_turma: 2, nome_turma: "7A" }, { id_turma: 3, nome_turma: "1A" }]];
        }
        if (sql.includes("FROM aluno_foto")) {
            if (state.semTabelaFotos) throw Object.assign(new Error("Tabela de teste ausente"), { code: "ER_NO_SUCH_TABLE" });
            const foto = state.fotos.get(parametros[0]);
            return [foto ? [{ ...foto }] : []];
        }
        if (sql.includes("FROM aluno a")) {
            if (!sql.includes("WHERE") && sql.includes("AS id")) return [[...state.contas.values(), ...state.alunosSemConta].map(a => ({ id: a.id_aluno, id_aluno: a.id_aluno, nome: a.nome, turma: a.turma }))];
            if (sql.includes("LEFT JOIN turma")) {
                const alunos = [...new Map([...state.contas.values()].map(c => [c.id_aluno,
                    { id_aluno: c.id_aluno, nome: c.nome, turma: c.turma, qr_code: c.qr, codigo_acesso: c.codigo }])).values(), ...state.alunosSemConta];
                return [sql.includes("WHERE a.id_aluno = ?") ? alunos.filter(a => a.id_aluno === parametros[0]) : alunos];
            }
            return [[...state.contas.values()].filter(c => sql.includes("WHERE a.id_aluno = ?") ? c.id_aluno === parametros[0]
                : parametros.includes(c.qr) || parametros.includes(c.codigo) || parametros.includes(c.qr.slice(0, 6).toUpperCase())).map(c => ({ ...c })).slice(0, 2)];
        }
        if (sql.includes("FROM mercadinho_operacao o")) {
            const op = state.operacoes.get(parametros[0]);
            return [op?.id_usuario === parametros[1] ? lerRecibo(op) : []];
        }
        throw new Error(`SQL de teste não previsto: ${sql}`);
    }
    return {
        state, execute: ler,
        async getConnection() {
            let op = null;
            let movimento = null;
            let contaNova = null;
            let fotoNova = null;
            let cotaNova = null;
            const usuariosNovos = new Map();
            const locks = [];
            const liberar = () => { while (locks.length) locks.pop()(); };
            return {
                async beginTransaction() {},
                async execute(sqlBruto, p = []) {
                    const sql = compacto(sqlBruto);
                    if (sql.includes("FROM usuario u") && sql.includes("FOR UPDATE")) {
                        locks.push(await lock(`usuario:${p[0]}`));
                        const u = usuariosNovos.get(Number(p[0])) || state.usuarios.get(Number(p[0]));
                        return [u ? [{ ...u }] : []];
                    }
                    if (sql.startsWith("SELECT senha_hash FROM usuario")) return [[{ senha_hash: (usuariosNovos.get(p[0]) || state.usuarios.get(p[0]))?.senha_hash }]];
                    if (sql.startsWith("UPDATE usuario SET senha_hash")) { usuariosNovos.set(p[1], { ...(usuariosNovos.get(p[1]) || state.usuarios.get(p[1])), senha_hash: p[0] }); return [{ affectedRows: 1 }]; }
                    if (sql.startsWith("UPDATE usuario_acesso SET trocar_senha = 1")) {
                        const u = usuariosNovos.get(p[0]) || state.usuarios.get(p[0]);
                        if (!u || u.perfil !== "FUNCIONARIO" || u.habilitado !== 1 || u.versao_sessao !== p[1]) return [{ affectedRows: 0 }];
                        if (state.falhar === "senha_funcionario") throw Object.assign(new Error("Falha simulada ao salvar o perfil"), { code: "ER_TEST_FAILURE" });
                        usuariosNovos.set(p[0], { ...u, trocar_senha: 1, versao_sessao: u.versao_sessao + 1 }); return [{ affectedRows: 1 }];
                    }
                    if (sql.startsWith("UPDATE usuario_acesso SET trocar_senha")) { const u = usuariosNovos.get(p[0]) || state.usuarios.get(p[0]); usuariosNovos.set(p[0], { ...u, trocar_senha: 0, versao_sessao: u.versao_sessao + 1 }); return [{ affectedRows: 1 }]; }
                    if (sql.startsWith("UPDATE usuario_acesso SET saldo_cota")) {
                        const u = usuariosNovos.get(p[1]) || state.usuarios.get(p[1]);
                        if (!u || u.perfil !== "FUNCIONARIO" || u.saldo_cota !== p[2]) return [{ affectedRows: 0 }];
                        if (state.falhar === "cota") throw Object.assign(new Error("Teste"), { code: "ER_TEST_FAILURE" });
                        usuariosNovos.set(p[1], { ...u, saldo_cota: p[0] }); return [{ affectedRows: 1 }];
                    }
                    if (sql.startsWith("INSERT INTO cota_operacao")) {
                        const caixa = sql.includes("VALUES ('CAIXA'");
                        const origem = caixa ? "CAIXA" : p[0], id = caixa ? p[0] : p[1];
                        locks.push(await lock(`cota:${origem}:${id}`));
                        if (state.cotas.has(`${origem}:${id}`)) throw Object.assign(new Error("Duplicada"), { code: "ER_DUP_ENTRY" });
                        cotaNova = caixa ? { origem, id_operacao: id, id_operador: p[1], requisicao_hash: p[2], id_funcionario: p[3], valor: p[4], cota_anterior: p[5], cota_posterior: p[6], id_aluno: p[7], id_conta: p[8], id_movimentacao: p[9], observacao: p[10] }
                            : { origem, id_operacao: id, id_operador: p[2], requisicao_hash: p[3], valor: p[4], observacao: p[5], cota_anterior: null, cota_posterior: null };
                        cotaNova.criado_em = "2026-10-19T15:00:00.000Z"; return [{ affectedRows: 1 }];
                    }
                    if (sql.startsWith("UPDATE cota_operacao")) {
                        Object.assign(cotaNova, { id_funcionario: p[0], cota_anterior: p[1], cota_posterior: p[2] });
                        if (sql.includes("id_aluno = ?")) Object.assign(cotaNova, { id_aluno: p[3], id_conta: p[4], id_movimentacao: p[5] });
                        return [{ affectedRows: 1 }];
                    }
                    if (sql.includes("FROM cota_operacao o") && cotaNova?.origem === p[0] && cotaNova?.id_operacao === p[1]) return [reciboCota(cotaNova)];
                    if (sql.includes("FROM conta c") && sql.includes("WHERE c.id_aluno = ?")) {
                        const conta = [...state.contas.values()].find(c => c.id_aluno === p[0]);
                        if (conta) locks.push(await lock(`conta:${conta.id_conta}`));
                        return [conta ? [{ ...state.contas.get(conta.id_conta) }] : []];
                    }
                    if (sql.startsWith("INSERT INTO aluno_foto")) {
                        if (state.semTabelaFotos) throw Object.assign(new Error("Tabela de teste ausente"), { code: "ER_NO_SUCH_TABLE" });
                        fotoNova = { id_aluno: p[0], imagem: p[1], largura: p[2], altura: p[3], id_usuario: p[4] };
                        return [{ affectedRows: 1 }];
                    }
                    if (sql.startsWith("INSERT INTO mercadinho_operacao")) {
                        locks.push(await lock(`op:${p[0]}`));
                        if (state.operacoes.has(p[0])) throw Object.assign(new Error("Duplicada"), { code: "ER_DUP_ENTRY" });
                        op = { id_operacao: p[0], id_usuario: p[1], requisicao_hash: p[2] };
                        return [{ affectedRows: 1 }];
                    }
                    if (sql.startsWith("SELECT id_aluno FROM aluno") && sql.includes("FOR UPDATE")) {
                        locks.push(await lock(`aluno:${p[0]}`));
                        const existe = [...state.contas.values()].some(c => c.id_aluno === p[0]) || state.alunosSemConta.some(a => a.id_aluno === p[0]);
                        return [existe ? [{ id_aluno: p[0] }] : []];
                    }
                    if (sql.includes("FROM conta") && sql.includes("FOR UPDATE")) {
                        locks.push(await lock(`conta:${p[0]}`));
                        const c = state.contas.get(p[0]);
                        return [c && c.id_aluno === p[1] ? [{ ...c }] : []];
                    }
                    if (sql.includes("FROM criterio")) return [state.semCriterio ? [] : [{ id_criterio: p[0].startsWith("Compra") ? 100 : 101 }]];
                    if (sql.startsWith("INSERT INTO movimentacao")) {
                        movimento = sql.includes("'ENTRADA'") ? { id_movimentacao: state.proximo++, valor: p[0], tipo: "ENTRADA", descricao: p[1], id_conta: p[2], id_criterio: p[3] }
                            : { id_movimentacao: state.proximo++, valor: p[0], tipo: p[1], descricao: p[2], id_conta: p[3], id_criterio: p[4] };
                        return [{ insertId: movimento.id_movimentacao }];
                    }
                    if (sql.startsWith("UPDATE conta")) {
                        if (state.falhar === "saldo") throw Object.assign(new Error("Teste"), { code: "ER_TEST_FAILURE" });
                        contaNova = { ...state.contas.get(p[1]), saldo: p[0] };
                        return [{ affectedRows: 1 }];
                    }
                    if (sql.startsWith("UPDATE mercadinho_operacao")) {
                        Object.assign(op, { id_conta: p[0], id_aluno: p[1], id_movimentacao: p[2], tipo: p[3], valor: p[4],
                            saldo_anterior: p[5], saldo_posterior: p[6], descricao: p[7], criado_em: "2026-10-23T13:00:00.000Z" });
                        return [{ affectedRows: 1 }];
                    }
                    if (sql.includes("FROM mercadinho_operacao o") && op?.id_operacao === p[0]) return [lerRecibo(op)];
                    return ler(sql, p);
                },
                async commit() {
                    if (contaNova) state.contas.set(contaNova.id_conta, contaNova);
                    if (fotoNova) state.fotos.set(fotoNova.id_aluno, { ...fotoNova });
                    if (movimento) state.movimentos.push(movimento);
                    if (op) state.operacoes.set(op.id_operacao, { ...op });
                    if (cotaNova) state.cotas.set(`${cotaNova.origem}:${cotaNova.id_operacao}`, { ...cotaNova });
                    for (const [id,u] of usuariosNovos) state.usuarios.set(id, { ...u });
                    liberar();
                    if (state.falhar === "resposta_commit") throw Object.assign(new Error("Resposta perdida"), { code: "ECONNRESET" });
                },
                async rollback() { op = null; movimento = null; contaNova = null; fotoNova = null; cotaNova = null; usuariosNovos.clear(); liberar(); },
                release() { liberar(); }
            };
        }
    };
}

module.exports = { criarBancoFalso };
