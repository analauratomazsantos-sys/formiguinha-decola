"use strict";

const { parentPort, workerData } = require("node:worker_threads");
const jpeg = require("../vendor/jpeg-js");

try {
    const original = Buffer.from(workerData.imagem);
    const imagem = jpeg.decode(original, { useTArray: true, tolerantDecoding: false,
        maxResolutionInMP: 0.25, maxMemoryUsageInMB: 16 });
    if (!imagem.width || !imagem.height || imagem.width > 480 || imagem.height > 480) throw new Error("Dimensão inválida");
    // Recria a imagem a partir dos pixels, descartando comentários, EXIF e outros metadados.
    const limpa = jpeg.encode({ data: imagem.data, width: imagem.width, height: imagem.height }, 80).data;
    if (limpa.length > 200 * 1024) throw new Error("Imagem muito grande");
    parentPort.postMessage({ imagem: limpa, largura: imagem.width, altura: imagem.height });
} catch {
    parentPort.postMessage({ erro: true });
}
