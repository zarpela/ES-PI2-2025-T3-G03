CREATE DATABASE IF NOT EXISTS notadez;
USE notadez;

-- 1. Usuário
CREATE TABLE usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    celular VARCHAR(20),
    senha VARCHAR(100) NOT NULL
);

-- 2. Instituição / Curso / Disciplina / Turma
CREATE TABLE instituicao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE curso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    instituicao_id INT,
    FOREIGN KEY (instituicao_id) REFERENCES instituicao(id) ON DELETE CASCADE
);

CREATE TABLE disciplina (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    sigla VARCHAR(20) NOT NULL,
    codigo VARCHAR(20),
    periodo VARCHAR(20),
    curso_id INT,
    usuario_id INT,
    FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

CREATE TABLE turma (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    apelido VARCHAR(50),
    disciplina_id INT,
    FOREIGN KEY (disciplina_id) REFERENCES disciplina(id) ON DELETE CASCADE
);

-- 3. Alunos e vínculo com Turmas
CREATE TABLE aluno (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identificador VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE aluno_turma (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT,
    turma_id INT,
    UNIQUE (aluno_id, turma_id),
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,
    FOREIGN KEY (turma_id) REFERENCES turma(id) ON DELETE CASCADE
);

-- 4. Componentes de Nota
CREATE TABLE componente_nota (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    sigla VARCHAR(10) NOT NULL,
    descricao TEXT,
    disciplina_id INT,
    FOREIGN KEY (disciplina_id) REFERENCES disciplina(id) ON DELETE CASCADE
);

-- 5. Notas por componente
CREATE TABLE nota (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_turma_id INT,
    componente_id INT,
    valor DECIMAL(4,2) CHECK (valor >= 0.00 AND valor <= 10.00),
    UNIQUE (aluno_turma_id, componente_id),
    FOREIGN KEY (aluno_turma_id) REFERENCES aluno_turma(id) ON DELETE CASCADE,
    FOREIGN KEY (componente_id) REFERENCES componente_nota(id) ON DELETE CASCADE
);

-- 6. Fórmula da Nota Final
CREATE TABLE formula_nota_final (
    id INT AUTO_INCREMENT PRIMARY KEY,
    disciplina_id INT,
    expressao TEXT NOT NULL,
    FOREIGN KEY (disciplina_id) REFERENCES disciplina(id) ON DELETE CASCADE
);

-- 7. Nota Final
CREATE TABLE nota_final (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_turma_id INT,
    valor_calculado DECIMAL(4,2),
    valor_ajustado DECIMAL(4,2),
    FOREIGN KEY (aluno_turma_id) REFERENCES aluno_turma(id) ON DELETE CASCADE
);

-- 8. Auditoria
CREATE TABLE auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT,
    usuario_id INT,
    componente_id INT,
    valor_antigo DECIMAL(4,2),
    valor_novo DECIMAL(4,2),
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aluno_id) REFERENCES aluno(id),
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    FOREIGN KEY (componente_id) REFERENCES componente_nota(id)
);
