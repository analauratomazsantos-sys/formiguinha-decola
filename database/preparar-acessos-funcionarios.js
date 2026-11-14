"use strict";
// Sem --aplicar: apenas SELECT. Com --aplicar: cria duas tabelas e os usuários novos.
// Não atualiza o administrador existente, contas, movimentos, fotos ou saldo de alunos.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), bcrypt = require("bcryptjs");
const { dadosCriterio } = require("./preparar-mercadinho");
const TABELAS = {
    usuario_acesso: `CREATE TABLE usuario_acesso (
        id_usuario INT UNSIGNED NOT NULL,
        perfil ENUM('ADMIN','FUNCIONARIO') NOT NULL,
        codigo_acesso CHAR(6) CHARACTER SET ascii COLLATE ascii_bin NULL,
        referencia_token_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
        cargos VARCHAR(500) NOT NULL DEFAULT '',
        habilitado TINYINT(1) NOT NULL DEFAULT 1,
        trocar_senha TINYINT(1) NOT NULL DEFAULT 0,
        versao_sessao INT UNSIGNED NOT NULL DEFAULT 1,
        saldo_cota DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_usuario), UNIQUE KEY uq_acesso_codigo (codigo_acesso), UNIQUE KEY uq_acesso_token (referencia_token_sha256),
        CONSTRAINT fk_acesso_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    cota_operacao: `CREATE TABLE cota_operacao (
        origem ENUM('LIBERACAO','DISTRIBUICAO','CAIXA') NOT NULL,
        id_operacao CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        id_operador INT UNSIGNED NOT NULL,
        requisicao_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        id_funcionario INT UNSIGNED NULL,
        valor DECIMAL(15,2) NOT NULL,
        cota_anterior DECIMAL(15,2) NULL, cota_posterior DECIMAL(15,2) NULL,
        id_aluno BIGINT UNSIGNED NULL, id_conta BIGINT UNSIGNED NULL, id_movimentacao BIGINT UNSIGNED NULL,
        observacao VARCHAR(200) NOT NULL DEFAULT '', criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (origem, id_operacao), UNIQUE KEY uq_cota_movimentacao (id_movimentacao),
        KEY idx_cota_funcionario_data (id_funcionario, criado_em), KEY idx_cota_operador_data (id_operador, criado_em),
        CONSTRAINT fk_cota_operador FOREIGN KEY (id_operador) REFERENCES usuario (id_usuario),
        CONSTRAINT fk_cota_funcionario FOREIGN KEY (id_funcionario) REFERENCES usuario (id_usuario)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
};
const COLUNAS = {
    usuario_acesso: ['id_usuario','perfil','codigo_acesso','referencia_token_sha256','cargos','habilitado','trocar_senha','versao_sessao','saldo_cota','criado_em'],
    cota_operacao: ['origem','id_operacao','id_operador','requisicao_hash','id_funcionario','valor','cota_anterior','cota_posterior','id_aluno','id_conta','id_movimentacao','observacao','criado_em']
};
const normalizar = nome => String(nome).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
function indiceUnico(indices, campos) {
    const grupos = new Map();
    for (const i of indices) {
        if (Number(i.Non_unique) !== 0) continue;
        if (!grupos.has(i.Key_name)) grupos.set(i.Key_name, []);
        grupos.get(i.Key_name).push(i);
    }
    return [...grupos.values()].some(itens => itens.sort((a,b) => Number(a.Seq_in_index)-Number(b.Seq_in_index)).map(i => i.Column_name).join(',') === campos);
}
function lerLista(arquivo) {
    const dados = JSON.parse(fs.readFileSync(arquivo, "utf8"));
    const lista = dados.funcionarios;
    if (!Array.isArray(lista) || !lista.length) throw new Error("Lista de funcionários vazia ou inválida.");
    const codigos = new Set(), nomes = new Set(), referencias = new Set();
    for (const p of lista) {
        if (typeof p.nome !== "string" || p.nome.length < 3 || p.nome.length > 120 || !Array.isArray(p.cargos) || !p.cargos.length || p.cargos.some(c => typeof c !== "string") || p.cargos.join(" / ").length > 500 ||
            !/^[A-F0-9]{6}$/.test(p.codigo_acesso) || !/^[a-f0-9]{64}$/.test(p.referencia_token_sha256)) throw new Error("Há um cadastro inválido na lista de funcionários.");
        if (codigos.has(p.codigo_acesso) || nomes.has(normalizar(p.nome)) || referencias.has(p.referencia_token_sha256)) throw new Error("Há uma identificação duplicada na lista.");
        codigos.add(p.codigo_acesso); nomes.add(normalizar(p.nome)); referencias.add(p.referencia_token_sha256);
    }
    return lista;
}
async function totais(db) {
    const [[r]] = await db.execute(`SELECT (SELECT COUNT(*) FROM conta) AS contas,
        (SELECT COUNT(*) FROM movimentacao) AS movimentacoes, (SELECT COALESCE(SUM(saldo), 0) FROM conta) AS saldo_total`);
    return r;
}
async function inspecionar(db, lista) {
    const [tabelas] = await db.execute(`SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('usuario','usuario_acesso','cota_operacao','aluno','conta','movimentacao','criterio')`);
    for (const nome of ['usuario','aluno','conta','movimentacao','criterio']) if (!tabelas.some(t => t.TABLE_NAME === nome)) throw new Error(`Tabela obrigatória ausente: ${nome}.`);
    for (const t of tabelas) if (String(t.ENGINE).toUpperCase() !== 'INNODB') throw new Error(`A tabela ${t.TABLE_NAME} precisa usar InnoDB.`);
    const [colunas] = await db.execute(`SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, CHARACTER_MAXIMUM_LENGTH
        FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('usuario','usuario_acesso','cota_operacao','criterio','conta','movimentacao') ORDER BY ORDINAL_POSITION`);
    const usuario = colunas.filter(c => c.TABLE_NAME === 'usuario');
    for (const campo of ['id_usuario','nome','email','senha_hash','ativo']) if (!usuario.some(c => c.COLUMN_NAME === campo)) throw new Error(`Campo ausente em usuario: ${campo}.`);
    if (usuario.find(c => c.COLUMN_NAME === 'id_usuario').COLUMN_TYPE.toLowerCase() !== 'int unsigned') throw new Error('A estrutura de id_usuario mudou; interrompido antes de criar tabelas.');
    for (const c of usuario) if (c.IS_NULLABLE === 'NO' && c.COLUMN_DEFAULT === null && !String(c.EXTRA).includes('auto_increment') && !['nome','email','senha_hash','ativo'].includes(c.COLUMN_NAME)) throw new Error(`Campo obrigatório de usuario precisa ser conferido: ${c.COLUMN_NAME}.`);
    for (const [campo, tamanho] of [['nome',120],['email',6],['senha_hash',60]]) if (Number(usuario.find(c => c.COLUMN_NAME === campo).CHARACTER_MAXIMUM_LENGTH) < tamanho) throw new Error(`O campo usuario.${campo} é curto demais.`);
    const [indicesUsuario] = await db.execute('SHOW INDEX FROM usuario');
    if (!indiceUnico(indicesUsuario, 'email')) throw new Error('A unicidade do usuário de login precisa ser conferida.');
    const faltantes = [];
    for (const [nome, campos] of Object.entries(COLUNAS)) {
        if (!tabelas.some(t => t.TABLE_NAME === nome)) { faltantes.push(nome); continue; }
        for (const campo of campos) if (!colunas.some(c => c.TABLE_NAME === nome && c.COLUMN_NAME === campo)) throw new Error(`A tabela ${nome} tem uma estrutura diferente: falta ${campo}.`);
        const [indices] = await db.execute(`SHOW INDEX FROM ${nome}`);
        const primaria = indices.filter(i => i.Key_name === 'PRIMARY').sort((a,b) => Number(a.Seq_in_index)-Number(b.Seq_in_index)).map(i => i.Column_name).join(',');
        if (primaria !== (nome === 'usuario_acesso' ? 'id_usuario' : 'origem,id_operacao')) throw new Error(`A chave primária de ${nome} precisa ser conferida.`);
        for (const chave of nome === 'usuario_acesso' ? ['codigo_acesso','referencia_token_sha256'] : ['id_movimentacao']) {
            if (!indiceUnico(indices, chave)) throw new Error(`A unicidade de ${nome}.${chave} precisa ser conferida.`);
        }
        for (const campo of nome === 'usuario_acesso' ? ['saldo_cota'] : ['valor','cota_anterior','cota_posterior']) {
            if (!/^decimal\(15,2\)$/i.test(colunas.find(c => c.TABLE_NAME === nome && c.COLUMN_NAME === campo).COLUMN_TYPE)) throw new Error(`O campo ${nome}.${campo} precisa usar DECIMAL(15,2).`);
        }
    }
    const obs = colunas.find(c => c.TABLE_NAME === 'movimentacao' && c.COLUMN_NAME === 'descricao_observacao');
    if (!obs || Number(obs.CHARACTER_MAXIMUM_LENGTH) < 200) throw new Error('A descrição das movimentações precisa comportar 200 caracteres.');
    const [criterios] = await db.execute('SELECT id_criterio, nome_criterio, ativo FROM criterio WHERE nome_criterio = ? LIMIT 2', ['Distribuição em aula']);
    if (criterios.length > 1 || criterios.length === 1 && Number(criterios[0].ativo) !== 1) throw new Error('O critério Distribuição em aula precisa ser conferido.');
    const criterio = criterios.length ? null : dadosCriterio(colunas.filter(c => c.TABLE_NAME === 'criterio'), 'Distribuição em aula', 'ENTRADA');
    const [usuarios] = await db.execute('SELECT id_usuario, nome, email, ativo FROM usuario ORDER BY id_usuario');
    const [perfis] = faltantes.includes('usuario_acesso') ? [[]] : await db.execute('SELECT id_usuario, perfil, codigo_acesso, referencia_token_sha256 FROM usuario_acesso');
    const administradores = perfis.filter(p => p.perfil === 'ADMIN' && usuarios.some(u => u.id_usuario === p.id_usuario && Number(u.ativo) === 1));
    let adminNovo = null;
    if (!administradores.length) {
        if (usuarios.length !== 1 || perfis.length || Number(usuarios[0].ativo) !== 1 || String(usuarios[0].email).toLowerCase() !== 'teste@formiguinha.local') throw new Error('O administrador existente precisa ser conferido antes da ativação.');
        adminNovo = usuarios[0].id_usuario;
    }
    const novos = [], existentes = [];
    for (const pessoa of lista) {
        const usuariosLogin = usuarios.filter(u => String(u.email).toLowerCase() === pessoa.codigo_acesso.toLowerCase());
        const perfil = perfis.find(p => p.referencia_token_sha256 === pessoa.referencia_token_sha256);
        if (perfil) {
            if (perfil.perfil !== 'FUNCIONARIO' || perfil.codigo_acesso !== pessoa.codigo_acesso || usuariosLogin.length !== 1 || usuariosLogin[0].id_usuario !== perfil.id_usuario || Number(usuariosLogin[0].ativo) !== 0 || normalizar(usuariosLogin[0].nome) !== normalizar(pessoa.nome)) throw new Error('Há um conflito nos usuários previamente importados.');
            existentes.push(pessoa); continue;
        }
        if (usuariosLogin.length || usuarios.some(u => normalizar(u.nome) === normalizar(pessoa.nome)) || perfis.some(p => p.codigo_acesso === pessoa.codigo_acesso)) throw new Error('Há um nome ou código já cadastrado sem o vínculo esperado. Confira antes de importar.');
        novos.push(pessoa);
    }
    return { faltantes, criterio, adminNovo, novos, existentes, totais: await totais(db) };
}
function csvCampo(texto) { return '"' + String(texto).replace(/"/g, '""') + '"'; }
async function preparar(db, lista, { aplicar = false, credenciais, log = console.log } = {}) {
    const previa = await inspecionar(db, lista);
    log('PRÉVIA DOS ACESSOS E COTAS DOS FUNCIONÁRIOS');
    log(`Pessoas na lista: ${lista.length}. Novos usuários: ${previa.novos.length}. Já importados e preservados: ${previa.existentes.length}.`);
    log(`Tabelas novas: ${previa.faltantes.length}. Administrador existente: preservado. Cota inicial de cada funcionário: 0,00 LRCash.`);
    log(`Critério Distribuição em aula: ${previa.criterio ? 'será criado' : 'já existe; preservado'}.`);
    log(`Totais dos estudantes: ${JSON.stringify(previa.totais)}`);
    if (!aplicar) { log('MODO PRÉVIA: nenhuma alteração foi feita. Envie este resultado para continuar.'); return previa; }
    if (previa.novos.length && (!credenciais || !path.isAbsolute(credenciais))) throw new Error('Informe um caminho absoluto para guardar as credenciais iniciais fora do projeto.');
    if (previa.novos.length) {
        const relativo = path.relative(path.resolve(__dirname, '..'), path.resolve(credenciais));
        if (relativo === '' || !relativo.startsWith('..' + path.sep) && !path.isAbsolute(relativo)) throw new Error('Guarde as credenciais fora da pasta do projeto.');
    }
    const connection = await db.getConnection(); let travado = false, transacao = false, arquivoCriado = false;
    try {
        const [[lock]] = await connection.execute("SELECT GET_LOCK('formiguinha_acessos_v2', 10) AS obtido");
        if (Number(lock.obtido) !== 1) throw new Error('Outra preparação de acessos está em andamento.');
        travado = true;
        const atual = await inspecionar(connection, lista);
        const senhas = [];
        for (const pessoa of atual.novos) {
            const senha = 'Fg' + crypto.randomBytes(15).toString('base64url');
            senhas.push({ pessoa, senha, hash: await bcrypt.hash(senha, 12) });
        }
        if (senhas.length) { fs.mkdirSync(path.dirname(credenciais), { recursive: true }); if (fs.existsSync(credenciais)) throw new Error('O arquivo de credenciais já existe. Ele não será sobrescrito.'); }
        // CREATE TABLE tem commit próprio; nenhuma tabela existente é alterada.
        for (const nome of atual.faltantes) await connection.query(TABELAS[nome]);
        await connection.beginTransaction(); transacao = true;
        if (atual.adminNovo !== null) await connection.execute("INSERT INTO usuario_acesso (id_usuario, perfil, trocar_senha) VALUES (?, 'ADMIN', 0)", [atual.adminNovo]);
        if (atual.criterio) {
            const campos = Object.keys(atual.criterio);
            await connection.execute(`INSERT INTO criterio (${campos.map(c => '`'+c+'`').join(',')}) VALUES (${campos.map(() => '?').join(',')})`, campos.map(c => atual.criterio[c]));
        }
        for (const { pessoa, hash } of senhas) {
            // O login antigo exige usuario.ativo=1. Funcionários entram apenas pelo perfil habilitado da nova versão.
            const [usuario] = await connection.execute('INSERT INTO usuario (nome, email, senha_hash, ativo) VALUES (?, ?, ?, 0)', [pessoa.nome, pessoa.codigo_acesso.toLowerCase(), hash]);
            await connection.execute(`INSERT INTO usuario_acesso (id_usuario, perfil, codigo_acesso, referencia_token_sha256, cargos, trocar_senha, saldo_cota)
                VALUES (?, 'FUNCIONARIO', ?, ?, ?, 1, 0.00)`, [usuario.insertId, pessoa.codigo_acesso, pessoa.referencia_token_sha256, pessoa.cargos.join(' / ')]);
        }
        if (senhas.length) {
            const conteudo = '\uFEFF' + [['Nome','Usuário','Senha provisória','Primeiro acesso'], ...senhas.map(s => [s.pessoa.nome,s.pessoa.codigo_acesso,s.senha,'Definir senha pessoal de pelo menos 4 caracteres'])].map(r => r.map(csvCampo).join(';')).join('\r\n') + '\r\n';
            fs.writeFileSync(credenciais, conteudo, { encoding: 'utf8', flag: 'wx', mode: 0o600 }); arquivoCriado = true;
        }
        await connection.commit(); transacao = false;
        const depois = await totais(db);
        if (JSON.stringify(depois) !== JSON.stringify(atual.totais)) throw new Error('A ativação terminou, mas os totais mudaram durante a conferência. Confira antes de testar.');
        log(`Ativação concluída: ${senhas.length} funcionários novos. Usuários anteriores e saldos dos estudantes preservados.`);
        if (arquivoCriado) log(`Credenciais iniciais gravadas somente neste computador: ${credenciais}`);
        log('As senhas não foram exibidas no terminal. Cada funcionário deve definir sua senha pessoal no primeiro acesso.');
        return { novos: senhas.length, existentes: atual.existentes.length, arquivo: arquivoCriado ? credenciais : null };
    } catch (erro) {
        if (transacao) await connection.rollback().catch(() => {});
        // Conserva o arquivo se a conexão cair durante o commit; uma nova prévia identifica quem foi importado.
        if (arquivoCriado) log(`O arquivo de credenciais foi conservado para conferência: ${credenciais}`);
        throw erro;
    } finally {
        if (travado) await connection.execute("SELECT RELEASE_LOCK('formiguinha_acessos_v2')").catch(() => {});
        connection.release();
    }
}
async function main(args) {
    let lista, credenciais, aplicar = false;
    for (let i=0;i<args.length;i++) {
        if (args[i] === '--lista') lista=args[++i];
        else if (args[i] === '--credenciais') credenciais=args[++i];
        else if (args[i] === '--aplicar') aplicar=true;
        else throw new Error('Use --lista, --credenciais e, depois da prévia, --aplicar.');
    }
    if (!lista) throw new Error('Informe --lista com o caminho de funcionarios.json.');
    const pessoas = lerLista(lista);
    require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
    const db = require('../api/config/database.js');
    try { await preparar(db, pessoas, { aplicar, credenciais }); } finally { await db.end(); }
}
if (require.main === module) main(process.argv.slice(2)).catch(erro => { console.error(erro.code ? `Preparação interrompida (${erro.code}). Nenhuma credencial foi exibida.` : erro.message); process.exitCode=1; });
module.exports = { TABELAS, COLUNAS, lerLista, inspecionar, preparar };
