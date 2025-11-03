import mysql from "mysql2/promise";

// Configuração da conexão
export const pool = mysql.createPool({
  host: "localhost",
  user: "root",       // ex: "root"
  password: "guilherme123",     // ex: ""
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
