"use strict";

const path = require("node:path");
const { Worker } = require("node:worker_threads");
const { ErroCaixa } = require("./mercadinhoService");
const { verificarEdicaoFoto } = require("./fotoAlunoIdentificacao");
let processando = false;

function prepararImagem(imagem) {
    if (!Buffer.isBuffer(imagem) || imagem.length < 4 || imagem.length > 200 * 1024 ||
        imagem[0] !== 0xff || imagem[1] !== 0xd8 || imagem[2] !== 0xff) {
        throw new ErroCaixa(400, "Escolha uma foto JPEG válida de até 200 KB após a preparação.");
    }
    if (processando) throw new ErroCaixa(429, "Outra foto está sendo preparada. Tente novamente em alguns instantes.");
    processando = true;
    return new Promise((resolve, reject) => {
        let encerrado = false, worker, timer;
        function concluir(erro, resultado) {
            if (encerrado) return;
            encerrado = true;
            clearTimeout(timer);
            processando = false;
            if (worker) worker.terminate().catch(() => {});
            if (erro) reject(erro); else resolve(resultado);
        }
        try {
            worker = new Worker(path.join(__dirname, "fotoAlunoWorker.js"), { workerData: { imagem },
                resourceLimits: { maxOldGenerationSizeMb: 32, stackSizeMb: 4 } });
            timer = setTimeout(() => concluir(new ErroCaixa(503, "Não foi possível preparar a foto. Tente uma imagem menor.")), 10000);
            worker.once("message", resultado => resultado.erro
                ? concluir(new ErroCaixa(400, "A foto não pôde ser validada. Escolha outra imagem."))
                : concluir(null, { ...resultado, imagem: Buffer.from(resultado.imagem) }));
            worker.once("error", () => concluir(new ErroCaixa(400, "A foto não pôde ser preparada. Escolha outra imagem.")));
            worker.once("exit", () => { if (!encerrado) concluir(new ErroCaixa(503, "A preparação da foto foi interrompida.")); });
        } catch { concluir(new ErroCaixa(503, "Não foi possível preparar a foto agora.")); }
    });
}

function erroBanco(erro) {
    if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(erro.code)) {
        return new ErroCaixa(503, "O cadastro de fotos precisa concluir sua preparação no banco.", { preparacaoNecessaria: true });
    }
    return erro;
}

function criarServicoFotos(db) {
    async function consultar(id) {
        const idAluno = Number(id);
        if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(idAluno) || idAluno <= 0) throw new ErroCaixa(400, "Aluno inválido.");
        try {
            const [rows] = await db.execute(`SELECT f.imagem, f.largura, f.altura FROM aluno_foto f
                INNER JOIN aluno a ON a.id_aluno = f.id_aluno WHERE f.id_aluno = ? LIMIT 1`, [idAluno]);
            return rows[0] || null;
        } catch (erro) { throw erroBanco(erro); }
    }

    async function salvar(imagem, token, usuarioId, segredo) {
        const idAluno = verificarEdicaoFoto(token, usuarioId, segredo);
        const foto = await prepararImagem(imagem);
        const connection = await db.getConnection();
        let transacao = false;
        try {
            await connection.beginTransaction(); transacao = true;
            const [alunos] = await connection.execute("SELECT id_aluno FROM aluno WHERE id_aluno = ? FOR UPDATE", [idAluno]);
            if (alunos.length !== 1) throw new ErroCaixa(404, "Estudante não encontrado. Atualize a lista antes de continuar.");
            await connection.execute(`INSERT INTO aluno_foto (id_aluno, imagem, largura, altura, id_usuario)
                VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE imagem = ?, largura = ?, altura = ?,
                id_usuario = ?, atualizado_em = CURRENT_TIMESTAMP`,
            [idAluno, foto.imagem, foto.largura, foto.altura, usuarioId, foto.imagem, foto.largura, foto.altura, usuarioId]);
            await connection.commit(); transacao = false;
            return { ok: true, largura: foto.largura, altura: foto.altura };
        } catch (erro) {
            if (transacao) await connection.rollback().catch(() => {});
            throw erroBanco(erro);
        } finally { connection.release(); }
    }
    return { consultar, salvar };
}

module.exports = { criarServicoFotos, prepararImagem };
