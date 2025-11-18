-- Desenvolvido por Rafael Candian
-- Script de atualização para adicionar sistema de auditoria de notas
-- Execute este script no banco de dados existente

USE notadez;

-- 1. Remover tabela antiga de auditoria se existir
DROP TABLE IF EXISTS auditoria;

-- 2. Criar nova tabela de auditoria de notas
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

-- 3. Remover triggers existentes se houver
DROP TRIGGER IF EXISTS trg_auditoria_nota_insert;
DROP TRIGGER IF EXISTS trg_auditoria_nota_update;

-- 4. Criar trigger para auditoria em INSERT de notas
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

-- 5. Criar trigger para auditoria em UPDATE de notas
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

-- Fim do script
SELECT 'Sistema de auditoria instalado com sucesso!' as status;
