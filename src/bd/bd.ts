import mysql from "mysql2/promise";

// Configuração da conexão
export const pool = mysql.createPool({
  host: "localhost",
  user: "root",       // ex: "root"
  password: "",     // ex: ""
  database: "notadez",       // nome do banco que você criou
  port: 3306,                // porta padrão do MySQL
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Teste da conexão
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Conectado ao MySQL!");
    conn.release();
  } catch (err) {
    console.error("❌ Erro ao conectar no MySQL:", err);
  }
})();

// CRUD de Disciplinas
export async function getDisciplinas() {
  const [rows] = await pool.query('SELECT * FROM disciplina');
  alert(rows);
  return rows;
  
}

export interface Disciplina {
  nome: string;
  sigla: string;
  codigo?: string;
  periodo?: string;
  curso_id?: number;
  usuario_id?: number;
}

export async function addDisciplina({ nome, sigla, codigo, periodo, curso_id, usuario_id }: Disciplina) {
  const [result] = await pool.query(
    'INSERT INTO disciplina (nome, sigla, codigo, periodo, curso_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
    [nome, sigla, codigo, periodo, curso_id, usuario_id]
  );
  return { id: result.insertId };
}


export async function updateDisciplina(id: number, { nome, sigla, codigo, periodo, curso_id, usuario_id }: Disciplina) {
  await pool.query(
    'UPDATE disciplina SET nome=?, sigla=?, codigo=?, periodo=?, curso_id=?, usuario_id=? WHERE id=?',
    [nome, sigla, codigo, periodo, curso_id, usuario_id, id]
  );
  return { id };
}

export async function deleteDisciplina(id: number) {
  await pool.query('DELETE FROM disciplina WHERE id=?', [id]);
  return { id };
}
