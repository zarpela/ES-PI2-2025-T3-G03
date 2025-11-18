//Desenvolvido por Guilherme Henrique Moreira

// Importa o mysql2/promise para trabalhar com conexões assíncronas
import mysql from "mysql2/promise";
// Importa o dotenv para carregar variáveis de ambiente
import dotenv from 'dotenv';

// Carrega variáveis do arquivo .env
dotenv.config();

// Cria um pool de conexões com o banco MySQL
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost", // Endereço do banco
  user: process.env.DB_USER || "root", // Usuário do MySQL
  password: process.env.DB_PASSWORD || "", // Senha
  database: process.env.DB_NAME || "", // Nome do banco
  port: Number(process.env.DB_PORT) || 3306, // Porta do MySQL
  waitForConnections: true, // Fila de espera caso limite seja atingido
  connectionLimit: 10, // Máx. de conexões simultâneas
  queueLimit: 0, // Sem limite de fila
});

// Teste da conexão ao iniciar o sistema
(async () => {
  try {
    const conn = await pool.getConnection(); // Tenta conectar
    console.log("✅ Conectado ao MySQL!");
    conn.release(); // Libera a conexão
  } catch (err) {
    console.error("❌ Erro ao conectar no MySQL:", err);
  }
})();

// CRUD de Disciplinas

// Busca todas as disciplinas no banco
export async function getDisciplinas() {
  const [rows] = await pool.query('SELECT * FROM disciplina'); // Executa SELECT
  console.log(rows);
  return rows; // Retorna os dados
}

// Interface para tipagem das disciplinas
export interface Disciplina {
  nome: string;
  sigla: string;
  codigo?: string;
  periodo?: string;
  curso_id?: number;
  usuario_id?: number;
}

// Adiciona uma disciplina no banco
export async function addDisciplina({ nome, sigla, codigo, periodo, curso_id, usuario_id }: Disciplina) {
  const [result] = await pool.query(
    'INSERT INTO disciplina (nome, sigla, codigo, periodo, curso_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
    [nome, sigla, codigo, periodo, curso_id, usuario_id] // Valores enviados
  );
  return { id: (result as any).insertId }; // Retorna ID criado
}

// Atualiza os dados de uma disciplina existente
export async function updateDisciplina(id: number, { nome, sigla, codigo, periodo, curso_id, usuario_id }: Disciplina) {
  await pool.query(
    'UPDATE disciplina SET nome=?, sigla=?, codigo=?, periodo=?, curso_id=?, usuario_id=? WHERE id=?',
    [nome, sigla, codigo, periodo, curso_id, usuario_id, id] // Valores + ID
  );
  return { id };
}

// Exclui uma disciplina pelo ID
export async function deleteDisciplina(id: number) {
  await pool.query('DELETE FROM disciplina WHERE id=?', [id]);
  return { id };
}
