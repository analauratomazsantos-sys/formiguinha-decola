require("dotenv").config();

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function validarSchema() {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const bancoTeste = "formiguinha_validacao";

    const conexao = await mysql.createConnection({
        host: dbUrl.hostname,
        port: Number(dbUrl.port || 3306),
        user: decodeURIComponent(dbUrl.username),
        password: decodeURIComponent(dbUrl.password),
        multipleStatements: true
    });

    try {
        console.log("Criando banco temporário de validação...");

        await conexao.query(`DROP DATABASE IF EXISTS ${bancoTeste}`);
        await conexao.query(
            `CREATE DATABASE ${bancoTeste}
             CHARACTER SET utf8mb4
             COLLATE utf8mb4_unicode_ci`
        );

        await conexao.query(`USE ${bancoTeste}`);

        const caminhoSchema = path.join(
            __dirname,
            "01_schema_railway.sql"
        );

        const sql = fs.readFileSync(caminhoSchema, "utf8");

        await conexao.query(sql);

        const [tabelas] = await conexao.query("SHOW TABLES");

        console.log("Schema validado com sucesso!");
        console.log("Quantidade de tabelas:", tabelas.length);

    } catch (erro) {
        console.error("Erro na validação do schema:");
        console.error(erro.message);

    } finally {
        await conexao.query(`DROP DATABASE IF EXISTS ${bancoTeste}`);
        await conexao.end();

        console.log("Banco temporário removido.");
    }
}

validarSchema();