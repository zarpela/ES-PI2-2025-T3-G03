import mysql from "mysql2";
import type { Pool, PoolConnection } from "mysql2";
import dotenv from "dotenv";
dotenv.config();

// Cria um pool de conexões, agora com anotação do tipo
const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "",
  port: Number(process.env.DB_PORT) || 3306,
  connectionLimit: 10,
});


// Testa a conexão pegando uma do pool
pool.getConnection((err: Error | null, connection: PoolConnection) => {
  if (err) {
    console.error("Erro ao conectar no MySQL:", err);
  } else {
    console.log("Conectado ao MySQL!");
    connection.release();
  }
});

export default pool;