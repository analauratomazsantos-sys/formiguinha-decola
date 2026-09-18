-- =========================================================
-- FORMIGUINHA DECOLA
-- Schema adaptado para MySQL no Railway
-- Baseado na modelagem criada pelo Marco
-- =========================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------
-- USUARIO
-- Professores/administradores que acessam o sistema
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (id_usuario),
    UNIQUE KEY uq_usuario_email (email)
) ENGINE=InnoDB;


-- ---------------------------------------------------------
-- TURMA
-- Turmas atendidas pelo projeto
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS turma (
    id_turma INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome_turma VARCHAR(20) NOT NULL,
    sala VARCHAR(30) NULL,

    PRIMARY KEY (id_turma),
    UNIQUE KEY uq_turma_nome (nome_turma)
) ENGINE=InnoDB;


-- ---------------------------------------------------------
-- ALUNO
-- Dados dos estudantes
-- ---------------------------------------------------------
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


-- ---------------------------------------------------------
-- CONTA
-- Conta individual do estudante no Banco Formigueiro
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS conta (
    id_conta INT UNSIGNED NOT NULL AUTO_INCREMENT,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    saldo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ra CHAR(12) NOT NULL,

    PRIMARY KEY (id_conta),

    UNIQUE KEY uq_conta_ra (ra),

    CONSTRAINT chk_conta_saldo_nao_negativo
        CHECK (saldo >= 0),

    CONSTRAINT fk_conta_aluno
        FOREIGN KEY (ra)
        REFERENCES aluno (ra)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- ---------------------------------------------------------
-- CRITERIO
-- Motivo pelo qual o aluno ganhou ou gastou LRCash
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS criterio (
    id_criterio INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome_criterio VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (id_criterio),

    UNIQUE KEY uq_criterio_nome (nome_criterio)
) ENGINE=InnoDB;


-- ---------------------------------------------------------
-- MOVIMENTACAO
-- Entradas e saídas de LRCash
-- ---------------------------------------------------------
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

    CONSTRAINT chk_movimentacao_valor_positivo
        CHECK (valor > 0),

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


-- =========================================================
-- EVOLUÇÃO 1: PRESENÇA
-- Um registro por aluno em cada dia letivo
-- =========================================================
CREATE TABLE IF NOT EXISTS presenca (
    id_presenca INT UNSIGNED NOT NULL AUTO_INCREMENT,

    ra CHAR(12) NOT NULL,
    data_aula DATE NOT NULL,
    presente BOOLEAN NOT NULL,

    lrcash_gerado DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    id_movimentacao INT UNSIGNED NULL,

    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_presenca),

    UNIQUE KEY uq_presenca_aluno_data (ra, data_aula),

    UNIQUE KEY uq_presenca_movimentacao (id_movimentacao),

    KEY idx_presenca_data (data_aula),

    CONSTRAINT chk_presenca_lrcash
        CHECK (
            lrcash_gerado >= 0
            AND lrcash_gerado <= 3
        ),

    CONSTRAINT fk_presenca_aluno
        FOREIGN KEY (ra)
        REFERENCES aluno (ra)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_presenca_movimentacao
        FOREIGN KEY (id_movimentacao)
        REFERENCES movimentacao (id_movimentacao)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- =========================================================
-- EVOLUÇÃO 2: SALA DO FUTURO
-- Resultado do aluno em determinado período/semanal
-- =========================================================
CREATE TABLE IF NOT EXISTS desempenho_sala_futuro (
    id_desempenho INT UNSIGNED NOT NULL AUTO_INCREMENT,

    ra CHAR(12) NOT NULL,

    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,

    tarefas_disponiveis INT UNSIGNED NOT NULL DEFAULT 0,
    tarefas_realizadas INT UNSIGNED NOT NULL DEFAULT 0,

    percentual DECIMAL(5,2) NULL,

    lrcash_gerado DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    id_movimentacao INT UNSIGNED NULL,

    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_desempenho),

    UNIQUE KEY uq_sala_futuro_aluno_periodo (
        ra,
        periodo_inicio,
        periodo_fim
    ),

    UNIQUE KEY uq_sala_futuro_movimentacao (
        id_movimentacao
    ),

    KEY idx_sala_futuro_periodo (
        periodo_inicio,
        periodo_fim
    ),

    CONSTRAINT chk_sala_futuro_periodo
        CHECK (periodo_fim >= periodo_inicio),

    CONSTRAINT chk_sala_futuro_tarefas
        CHECK (tarefas_realizadas <= tarefas_disponiveis),

    CONSTRAINT chk_sala_futuro_percentual
        CHECK (
            percentual IS NULL
            OR (
                percentual >= 0
                AND percentual <= 100
            )
        ),

    CONSTRAINT chk_sala_futuro_lrcash
        CHECK (
            lrcash_gerado >= 0
            AND lrcash_gerado <= 7
        ),

    CONSTRAINT fk_sala_futuro_aluno
        FOREIGN KEY (ra)
        REFERENCES aluno (ra)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_sala_futuro_movimentacao
        FOREIGN KEY (id_movimentacao)
        REFERENCES movimentacao (id_movimentacao)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;