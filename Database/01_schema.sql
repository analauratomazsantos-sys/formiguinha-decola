-- Formiguinha Decola - Banco de Dados
-- MySQL 8.x / InnoDB / utf8mb4
-- 01_schema.sql

CREATE DATABASE IF NOT EXISTS formiguinha_decola
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE formiguinha_decola;

-- USUARIO: acesso ao sistema.
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_usuario),
    UNIQUE KEY uq_usuario_email (email)
) ENGINE=InnoDB;

-- TURMA: turmas atendidas pelo sistema.
CREATE TABLE IF NOT EXISTS turma (
    id_turma INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome_turma VARCHAR(20) NOT NULL,
    sala VARCHAR(30) NULL,
    PRIMARY KEY (id_turma),
    UNIQUE KEY uq_turma_nome (nome_turma)
) ENGINE=InnoDB;

-- ALUNO: dados do estudante e seu vínculo com a turma.
CREATE TABLE IF NOT EXISTS aluno (
    ra CHAR(12) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(20) NULL,
    data_nascimento DATE NULL,
    id_turma INT UNSIGNED NOT NULL,
    qr_code VARCHAR(64) NOT NULL,
    PRIMARY KEY (ra),
    UNIQUE KEY uq_aluno_qr_code (qr_code),
    KEY idx_aluno_turma_nome (id_turma, nome),
    CONSTRAINT fk_aluno_turma
        FOREIGN KEY (id_turma)
        REFERENCES turma (id_turma)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- CONTA: conta individual do estudante no Banco Formigueiro.
CREATE TABLE IF NOT EXISTS conta (
    id_conta INT UNSIGNED NOT NULL AUTO_INCREMENT,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    saldo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ra CHAR(12) NOT NULL,
    PRIMARY KEY (id_conta),
    UNIQUE KEY uq_conta_ra (ra),
    CONSTRAINT chk_conta_saldo_nao_negativo CHECK (saldo >= 0),
    CONSTRAINT fk_conta_aluno
        FOREIGN KEY (ra)
        REFERENCES aluno (ra)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- CRITERIO: motivo da movimentação de LRCash.
CREATE TABLE IF NOT EXISTS criterio (
    id_criterio INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome_criterio VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_criterio),
    UNIQUE KEY uq_criterio_nome (nome_criterio)
) ENGINE=InnoDB;

-- MOVIMENTACAO: entradas e futuras saídas de LRCash.
CREATE TABLE IF NOT EXISTS movimentacao (
    id_movimentacao INT UNSIGNED NOT NULL AUTO_INCREMENT,
    valor DECIMAL(10,2) NOT NULL,
    tipo ENUM('ENTRADA', 'SAIDA') NOT NULL,
    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descricao_observacao VARCHAR(255) NULL,
    id_conta INT UNSIGNED NOT NULL,
    id_criterio INT UNSIGNED NOT NULL,
    PRIMARY KEY (id_movimentacao),
    KEY idx_movimentacao_conta_data (id_conta, data_hora),
    KEY idx_movimentacao_criterio (id_criterio),
    CONSTRAINT chk_movimentacao_valor_positivo CHECK (valor > 0),
    CONSTRAINT fk_movimentacao_conta
        FOREIGN KEY (id_conta)
        REFERENCES conta (id_conta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_movimentacao_criterio
        FOREIGN KEY (id_criterio)
        REFERENCES criterio (id_criterio)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;
