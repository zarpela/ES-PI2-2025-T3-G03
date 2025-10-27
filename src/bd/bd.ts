import { Pool } from 'pg';

// Configuração da conexão
const pool = new Pool({
  user: 'SEU_USUARIO',
  host: 'localhost',   // ou o host do seu banco
  database: 'SEU_BANCO',
  password: 'SUA_SENHA',
  port: 5432,          // porta padrão do PostgreSQL
});

// Testando a conexão
pool.connect()
  .then(client => {
    console.log('Conectado ao PostgreSQL!');
    client.release(); // libera a conexão
  })
  .catch(err => {
    console.error('Erro ao conectar no PostgreSQL', err.stack);
  });

export default pool;
