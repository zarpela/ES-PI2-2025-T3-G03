CREATE DATABASE notadez; 
\c notadez;               -- Conecta ao banco de dados "notadez"

-- 1. Usuário
CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,      
    nome VARCHAR(100) NOT NULL, 
    email VARCHAR(100) UNIQUE NOT NULL,
    celular VARCHAR(20),         
    senha VARCHAR(100) NOT NULL  
);

-- 2. Instituição / Curso / Disciplina / Turma
CREATE TABLE instituicao (
    id SERIAL PRIMARY KEY,     
    nome VARCHAR(100) NOT NULL   
);

CREATE TABLE curso (
    id SERIAL PRIMARY KEY,       
    nome VARCHAR(100) NOT NULL,  
    instituicao_id INT REFERENCES instituicao(id) ON DELETE CASCADE
    -- Cada curso pertence a uma instituição; se a instituição for deletada, os cursos também
);

CREATE TABLE disciplina (
    id SERIAL PRIMARY KEY,       
    nome VARCHAR(100) NOT NULL,  
    sigla VARCHAR(20) NOT NULL,  
    codigo VARCHAR(20),          
    periodo VARCHAR(20),         
    curso_id INT REFERENCES curso(id) ON DELETE CASCADE, 
    -- Cada disciplina pertence a um curso
    usuario_id INT REFERENCES usuario(id) 
    -- Vincula a disciplina a um usuário (professor), se quiser
);

CREATE TABLE turma (
    id SERIAL PRIMARY KEY,       
    codigo VARCHAR(20) NOT NULL, 
    nome VARCHAR(100) NOT NULL,  
    apelido VARCHAR(50),         
    disciplina_id INT REFERENCES disciplina(id) ON DELETE CASCADE
    -- Cada turma pertence a uma disciplina
);

-- 3. Alunos e vínculo com Turmas
CREATE TABLE aluno (
    id SERIAL PRIMARY KEY,
    identificador VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE aluno_turma (
    id SERIAL PRIMARY KEY,
    aluno_id INT REFERENCES aluno(id) ON DELETE CASCADE, -- Vínculo aluno-turma
    turma_id INT REFERENCES turma(id) ON DELETE CASCADE,
    UNIQUE (aluno_id, turma_id) -- Garante que o mesmo aluno não fique duplicado na mesma turma
);

-- 4. Componentes de Nota
CREATE TABLE componente_nota (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    sigla VARCHAR(10) NOT NULL,
    descricao TEXT,
    disciplina_id INT REFERENCES disciplina(id) ON DELETE CASCADE
    -- Cada componente pertence a uma disciplina
);

-- 5. Notas por componente
CREATE TABLE nota (
    id SERIAL PRIMARY KEY,
    aluno_turma_id INT REFERENCES aluno_turma(id) ON DELETE CASCADE, 
    componente_id INT REFERENCES componente_nota(id) ON DELETE CASCADE, 
    valor NUMERIC(4,2) CHECK (valor >= 0.00 AND valor <= 10.00), -- Valor da nota de 0 a 10
    UNIQUE (aluno_turma_id, componente_id) -- Garante que não haja nota duplicada para o mesmo componente
);

-- 6. Fórmula da Nota Final
CREATE TABLE formula_nota_final (
    id SERIAL PRIMARY KEY,
    disciplina_id INT REFERENCES disciplina(id) ON DELETE CASCADE, 
    expressao TEXT NOT NULL 
);

-- 7. Nota Final
CREATE TABLE nota_final (
    id SERIAL PRIMARY KEY,
    aluno_turma_id INT REFERENCES aluno_turma(id) ON DELETE CASCADE, 
    valor_calculado NUMERIC(4,2), 
    valor_ajustado NUMERIC(4,2)  
);

-- 8. Auditoria
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    aluno_id INT REFERENCES aluno(id),            
    usuario_id INT REFERENCES usuario(id),       
    componente_id INT REFERENCES componente_nota(id), 
    valor_antigo NUMERIC(4,2),                     
    valor_novo NUMERIC(4,2),                       
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Data e hora da alteração
);
