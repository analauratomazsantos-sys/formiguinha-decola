const mysql = require("mysql2/promise");

function criarConfiguracao() {
    const configuracaoComum = {
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: "utf8mb4"
    };

    if (process.env.DATABASE_URL) {
        const url = new URL(process.env.DATABASE_URL);

        return {
            ...configuracaoComum,
            host: url.hostname,
            port: Number(url.port || 3306),
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database: decodeURIComponent(
                url.pathname.replace(/^\/+/, "")
            ) || "formiguinha_decola"
        };
    }

    return {
        ...configuracaoComum,
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "formiguinha_decola"
    };
}

const pool = mysql.createPool(criarConfiguracao());

module.exports = pool;