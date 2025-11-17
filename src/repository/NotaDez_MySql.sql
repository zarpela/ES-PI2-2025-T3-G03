-- Desenvolvido por Guilherme Henrique Moreira
CREATE DATABASE IF NOT EXISTS notadez;
USE notadez;

-- 1. Usuário
CREATE TABLE usuario (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    celular VARCHAR(20),
    senha VARCHAR(100) NOT NULL
);

-- 2. Instituição / Curso / Disciplina / Turma
CREATE TABLE instituicao (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cnpj VARCHAR(20),
    usuario_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE TABLE curso (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    instituicao_id BIGINT UNSIGNED,
    usuario_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (instituicao_id) REFERENCES instituicao(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE TABLE disciplina (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    sigla VARCHAR(20) NOT NULL,
    codigo VARCHAR(20),
    periodo VARCHAR(20),
    curso_id BIGINT UNSIGNED,
    usuario_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE TABLE turma (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    apelido VARCHAR(50),
    disciplina_id BIGINT UNSIGNED,
    usuario_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (disciplina_id) REFERENCES disciplina(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- 3. Alunos e vínculo com Turmas
CREATE TABLE aluno (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    identificador VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE aluno_turma (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    aluno_id BIGINT UNSIGNED,
    turma_id BIGINT UNSIGNED,
    UNIQUE KEY (aluno_id, turma_id),
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,
    FOREIGN KEY (turma_id) REFERENCES turma(id) ON DELETE CASCADE
);

-- 4. Componentes de Nota
CREATE TABLE componente_nota (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    sigla VARCHAR(10) NOT NULL,
    descricao TEXT,
    disciplina_id BIGINT UNSIGNED,
    FOREIGN KEY (disciplina_id) REFERENCES disciplina(id) ON DELETE CASCADE
);

-- 5. Notas por componente
CREATE TABLE nota (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    aluno_turma_id BIGINT UNSIGNED,
    componente_id BIGINT UNSIGNED,
    valor DECIMAL(4,2) CHECK (valor >= 0.00 AND valor <= 10.00),
    UNIQUE KEY (aluno_turma_id, componente_id),
    FOREIGN KEY (aluno_turma_id) REFERENCES aluno_turma(id) ON DELETE CASCADE,
    FOREIGN KEY (componente_id) REFERENCES componente_nota(id) ON DELETE CASCADE
);

-- 6. Fórmula da Nota Final
CREATE TABLE formula_nota_final (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    disciplina_id BIGINT UNSIGNED,
    expressao TEXT NOT NULL,
    FOREIGN KEY (disciplina_id) REFERENCES disciplina(id) ON DELETE CASCADE
);

-- 7. Nota Final
CREATE TABLE nota_final (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    aluno_turma_id BIGINT UNSIGNED,
    valor_calculado DECIMAL(4,2),
    valor_ajustado DECIMAL(4,2),
    FOREIGN KEY (aluno_turma_id) REFERENCES aluno_turma(id) ON DELETE CASCADE
);

-- 8. Auditoria
CREATE TABLE auditoria_nota (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    aluno_id BIGINT UNSIGNED,
    componente_id BIGINT UNSIGNED,
    turma_id BIGINT UNSIGNED,
    valor_antigo DECIMAL(4,2),
    valor_novo DECIMAL(4,2),
    operacao ENUM('INSERT', 'UPDATE') NOT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,
    FOREIGN KEY (componente_id) REFERENCES componente_nota(id) ON DELETE CASCADE,
    FOREIGN KEY (turma_id) REFERENCES turma(id) ON DELETE CASCADE,
    INDEX idx_data_hora (data_hora DESC),
    INDEX idx_turma_data (turma_id, data_hora DESC)
);

-- Trigger para auditoria em INSERT de notas
DELIMITER $$
CREATE TRIGGER trg_auditoria_nota_insert
AFTER INSERT ON nota
FOR EACH ROW
BEGIN
    DECLARE v_aluno_id BIGINT UNSIGNED;
    DECLARE v_turma_id BIGINT UNSIGNED;
    
    -- Busca aluno_id e turma_id a partir do aluno_turma_id
    SELECT aluno_id, turma_id INTO v_aluno_id, v_turma_id
    FROM aluno_turma
    WHERE id = NEW.aluno_turma_id;
    
    -- Registra a inserção na auditoria
    INSERT INTO auditoria_nota (aluno_id, componente_id, turma_id, valor_antigo, valor_novo, operacao)
    VALUES (v_aluno_id, NEW.componente_id, v_turma_id, NULL, NEW.valor, 'INSERT');
END$$
DELIMITER ;

-- Trigger para auditoria em UPDATE de notas
DELIMITER $$
CREATE TRIGGER trg_auditoria_nota_update
AFTER UPDATE ON nota
FOR EACH ROW
BEGIN
    DECLARE v_aluno_id BIGINT UNSIGNED;
    DECLARE v_turma_id BIGINT UNSIGNED;
    
    -- Só registra se o valor realmente mudou
    IF OLD.valor <> NEW.valor THEN
        -- Busca aluno_id e turma_id a partir do aluno_turma_id
        SELECT aluno_id, turma_id INTO v_aluno_id, v_turma_id
        FROM aluno_turma
        WHERE id = NEW.aluno_turma_id;
        
        -- Registra a atualização na auditoria
        INSERT INTO auditoria_nota (aluno_id, componente_id, turma_id, valor_antigo, valor_novo, operacao)
        VALUES (v_aluno_id, NEW.componente_id, v_turma_id, OLD.valor, NEW.valor, 'UPDATE');
    END IF;
END$$
DELIMITER ;
