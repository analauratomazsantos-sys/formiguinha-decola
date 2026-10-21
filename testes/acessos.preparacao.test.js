"use strict";
const { test } = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), bcrypt = require("bcryptjs");
const { COLUNAS, preparar } = require("../database/preparar-acessos-funcionarios");
const lista = [{ nome: "Professora fictícia", cargos: ["Professora", "Coordenadora"], codigo_acesso: "ABC999", referencia_token_sha256: "a".repeat(64) }];
function banco() {
    const s = { tabelas: [], usuarios: [{ id_usuario: 5, nome: "Administradora fictícia", email: "teste@formiguinha.local", ativo: 1, senha_hash: "hash-anterior-preservado" }], perfis: [], criterios: [], escritas: [], falhar: false, desconhecido: false };
    const coluna = (t, n, tipo = "varchar(255)", extra = "") => ({ TABLE_NAME: t, COLUMN_NAME: n, COLUMN_TYPE: tipo, IS_NULLABLE: "YES", COLUMN_DEFAULT: null, EXTRA: extra, CHARACTER_MAXIMUM_LENGTH: /varchar/.test(tipo) ? 255 : null });
    let transacao = null;
    const dados = () => transacao || s;
    const db = {
        state: s,
        async execute(sql, p = []) {
            if (sql.includes("information_schema.TABLES")) return [[...["usuario","aluno","conta","movimentacao","criterio",...s.tabelas].map(TABLE_NAME => ({ TABLE_NAME, ENGINE: "InnoDB" }))]];
            if (sql.includes("information_schema.COLUMNS")) return [[
                coluna("usuario","id_usuario","int unsigned","auto_increment"), ...["nome","email","senha_hash"].map(n => coluna("usuario",n)), coluna("usuario","ativo","tinyint(1)"),
                coluna("criterio","id_criterio","int unsigned","auto_increment"), coluna("criterio","nome_criterio"), coluna("criterio","ativo","tinyint(1)"), coluna("movimentacao","descricao_observacao"),
                ...s.tabelas.flatMap(t => COLUNAS[t].map(n => coluna(t,n, ["saldo_cota","valor","cota_anterior","cota_posterior"].includes(n) ? "decimal(15,2)" : "varchar(255)"))),
                ...(s.desconhecido ? [{ ...coluna("usuario","obrigatorio_desconhecido"), IS_NULLABLE: "NO" }] : [])
            ]];
            if (sql.startsWith("SHOW INDEX")) {
                const t = sql.split(" ").at(-1), chaves = t === "usuario" ? { PRIMARY: ["id_usuario"], uq: ["email"] } : t === "usuario_acesso" ? { PRIMARY: ["id_usuario"], cod: ["codigo_acesso"], ref: ["referencia_token_sha256"] } : { PRIMARY: ["origem","id_operacao"], mov: ["id_movimentacao"] };
                return [Object.entries(chaves).flatMap(([Key_name, ns]) => ns.map((Column_name,i) => ({ Key_name, Column_name, Non_unique: 0, Seq_in_index: i+1 })))];
            }
            if (sql.startsWith("SELECT id_criterio")) return [dados().criterios.filter(c => c.nome_criterio === p[0])];
            if (sql.startsWith("SELECT id_usuario, nome")) return [dados().usuarios.map(u => ({ ...u }))];
            if (sql.startsWith("SELECT id_usuario, perfil")) return [dados().perfis.map(u => ({ ...u }))];
            if (sql.includes("AS contas")) return [[{ contas: 3, movimentacoes: 12, saldo_total: "55.00" }]];
            if (sql.includes("GET_LOCK")) return [[{ obtido: 1 }]];
            if (sql.includes("RELEASE_LOCK")) return [[{ liberado: 1 }]];
            if (sql.startsWith("INSERT INTO")) {
                s.escritas.push(sql);
                if (sql.startsWith("INSERT INTO criterio")) { dados().criterios.push({ id_criterio: 100, nome_criterio: p[0], ativo: 1 }); return [{ affectedRows: 1 }]; }
                if (sql.startsWith("INSERT INTO usuario (")) {
                    assert.match(sql, /VALUES \(\?, \?, \?, 0\)$/);
                    dados().usuarios.push({ id_usuario: 6, nome: p[0], email: p[1], senha_hash: p[2], ativo: 0 }); return [{ insertId: 6, affectedRows: 1 }];
                }
                if (sql.startsWith("INSERT INTO usuario_acesso")) {
                    if (s.falhar && sql.includes("'FUNCIONARIO'")) throw Error("falha de escrita simulada");
                    dados().perfis.push({ id_usuario: p[0], perfil: sql.includes("'ADMIN'") ? "ADMIN" : "FUNCIONARIO", codigo_acesso: p[1] || null, referencia_token_sha256: p[2] || null, cargos: p[3] || "", habilitado: 1, trocar_senha: p[1] ? 1 : 0, versao_sessao: 1, saldo_cota: "0.00" }); return [{ affectedRows: 1 }];
                }
            }
            throw Error("SQL não previsto no teste: " + sql);
        },
        async query(sql) { assert.match(sql, /^CREATE TABLE (usuario_acesso|cota_operacao) /); s.escritas.push(sql); s.tabelas.push(sql.split(" ")[2]); },
        async getConnection() { return { ...db,
            async beginTransaction() { transacao = structuredClone({ usuarios: s.usuarios, perfis: s.perfis, criterios: s.criterios }); },
            async commit() { Object.assign(s, transacao); transacao = null; }, async rollback() { transacao = null; }, release() {}
        }; }
    };
    return db;
}
test("prévia de acessos lê sem criar usuários, ler senhas ou emitir credenciais", async () => {
    const db = banco(), logs = [];
    const r = await preparar(db, lista, { log: t => logs.push(t) });
    assert.equal(r.novos.length, 1); assert.equal(r.adminNovo, 5); assert.equal(db.state.escritas.length, 0);
    assert.doesNotMatch(logs.join("\n"), /hash-anterior-preservado/);
    assert.deepEqual(r.totais, { contas: 3, movimentacoes: 12, saldo_total: "55.00" });
});
test("importação protege o login legado, preserva admin e saldos e pode ser repetida sem redefinir senha ou cota", async () => {
    const db = banco(), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "formiguinha-preparacao-")), arquivo = path.join(tmp,"credenciais.csv"), logs = [];
    try {
        const antes = structuredClone(db.state.usuarios[0]);
        await preparar(db, lista, { aplicar: true, credenciais: arquivo, log: t => logs.push(t) });
        assert.deepEqual(db.state.usuarios[0], antes); assert.equal(db.state.usuarios.length, 2);
        const u = db.state.usuarios[1], perfil = db.state.perfis.find(p => p.id_usuario === 6);
        assert.equal(u.ativo, 0, "a versão antiga deve recusar este login"); assert.equal(perfil.habilitado, 1);
        assert.equal(perfil.saldo_cota,"0.00"); assert.equal(perfil.trocar_senha,1); assert.equal(perfil.cargos,"Professora / Coordenadora");
        const csv = fs.readFileSync(arquivo,"utf8"), senha = csv.split("\r\n")[1].split(";")[2].slice(1,-1);
        assert.equal(await bcrypt.compare(senha,u.senha_hash),true); assert.equal(senha.length,22); assert.ok(logs.every(l => !l.includes(senha)));
        perfil.saldo_cota = "75.00"; perfil.trocar_senha = 0; const hash = u.senha_hash, escritas = db.state.escritas.length;
        const r = await preparar(db,lista,{ aplicar:true, credenciais:arquivo,log:()=>{} });
        assert.equal(r.novos,0); assert.equal(db.state.escritas.length,escritas); assert.equal(db.state.perfis.find(p=>p.id_usuario===6).saldo_cota,"75.00");
        assert.equal(db.state.usuarios[1].senha_hash,hash); assert.equal(fs.readFileSync(arquivo,"utf8"),csv);
        assert.ok(db.state.escritas.every(sql => !/^(UPDATE|DELETE|ALTER|DROP|REPLACE)/i.test(sql)));
    } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});
test("conflitos, estrutura desconhecida e credenciais dentro do projeto bloqueiam a importação", async () => {
    for (const alterar of [s=>s.desconhecido=true, s=>s.usuarios.push({id_usuario:9,nome:lista[0].nome,email:"outro",ativo:1})]) {
        const db=banco(); alterar(db.state);
        await assert.rejects(preparar(db,lista,{aplicar:true,credenciais:path.join(os.tmpdir(),"nao-criar.csv"),log:()=>{}})); assert.equal(db.state.escritas.length,0);
    }
    const db=banco(); await assert.rejects(preparar(db,lista,{aplicar:true,credenciais:path.join(__dirname,"credenciais.csv"),log:()=>{}}), /fora da pasta/); assert.equal(db.state.escritas.length,0);
});
test("falha durante importação reverte usuários, perfis e critério; arquivo existente não é sobrescrito", async () => {
    const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"formiguinha-reversao-")), arquivo=path.join(tmp,"credenciais.csv");
    try {
        const db=banco(); db.state.falhar=true;
        await assert.rejects(preparar(db,lista,{aplicar:true,credenciais:arquivo,log:()=>{}}));
        assert.equal(db.state.usuarios.length,1); assert.equal(db.state.perfis.length,0); assert.equal(db.state.criterios.length,0); assert.equal(fs.existsSync(arquivo),false);
        fs.writeFileSync(arquivo,"conservar"); const outro=banco();
        await assert.rejects(preparar(outro,lista,{aplicar:true,credenciais:arquivo,log:()=>{}}), /não será sobrescrito/);
        assert.equal(outro.state.escritas.length,0); assert.equal(fs.readFileSync(arquivo,"utf8"),"conservar");
    } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});
