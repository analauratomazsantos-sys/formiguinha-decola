require("dotenv").config();

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function validarSeed() {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const bancoTeste = "formiguinha_validacao_seed";

    const conexao = await mysql.createConnection({
        host: dbUrl.hostname,
        port: Number(dbUrl.port || 3306),
        user: decodeURIComponent(dbUrl.username),
        password: decodeURIComponent(dbUrl.password),
        multipleStatements: true
    });

    try {
        console.log("Criando banco temporário para validar os dados...");

        await conexao.query(`DROP DATABASE IF EXISTS ${bancoTeste}`);

        await conexao.query(`
            CREATE DATABASE ${bancoTeste}
            CHARACTER SET utf8mb4
            COLLATE utf8mb4_unicode_ci
        `);

        await conexao.query(`USE ${bancoTeste}`);

        const caminhoSchema = path.join(
            __dirname,
            "01_schema_railway.sql"
        );

        const caminhoSeed = path.join(
            __dirname,
            "02_seed_railway.sql"
        );

        const schema = fs.readFileSync(caminhoSchema, "utf8");
        const seed = fs.readFileSync(caminhoSeed, "utf8");

        console.log("Criando tabelas...");
        await conexao.query(schema);

        console.log("Importando dados de teste...");
        await conexao.query(seed);

        const [[turmas]] = await conexao.query(
            "SELECT COUNT(*) AS total FROM turma"
        );

        const [[alunos]] = await conexao.query(
            "SELECT COUNT(*) AS total FROM aluno"
        );

        const [[contas]] = await conexao.query(
            "SELECT COUNT(*) AS total FROM conta"
        );

        const [[criterios]] = await conexao.query(
            "SELECT COUNT(*) AS total FROM criterio"
        );

        const [[movimentacoes]] = await conexao.query(
            "SELECT COUNT(*) AS total FROM movimentacao"
        );

        console.log("");
        console.log("Resultado da validação:");
        console.log("Turmas:", turmas.total);
        console.log("Alunos:", alunos.total);
        console.log("Contas:", contas.total);
        console.log("Critérios:", criterios.total);
        console.log("Movimentações:", movimentacoes.total);

        if (
            turmas.total === 6 &&
            alunos.total === 191 &&
            contas.total === 191 &&
            criterios.total === 2 &&
            movimentacoes.total === 0
        ) {
            console.log("");
            console.log("Seed validado com sucesso!");
        } else {
            throw new Error(
                "As quantidades encontradas não correspondem ao esperado."
            );
        }

    } catch (erro) {
        console.error("");
        console.error("Erro na validação do seed:");
        console.error(erro.message);

    } finally {
        await conexao.query(
            `DROP DATABASE IF EXISTS ${bancoTeste}`
        );

        await conexao.end();

        console.log("Banco temporário removido.");
    }
}

validarSeed();