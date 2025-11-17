//Desenvolvido por Murillo Iamarino Caravita

import express from 'express';          // Importa o Express para criar rotas
const router = express.Router();        // Instancia o roteador do Express
import path from 'path';                // Lida com caminhos de arquivos
import { fileURLToPath } from 'url';    // Necessário para usar __dirname com ESModules
import { pool } from "../repository/bd.ts"; // Conexão com o banco de dados
import bcrypt from "bcryptjs";          // Para comparar hash de senha
import jwt from "jsonwebtoken";         // Para gerar tokens JWT

// Obtém o caminho absoluto do arquivo atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chave secreta para gerar tokens JWT (ideal mover para .env)
const SECRET = "segredo_super_secreto"; // depois coloca em variável de ambiente (.env)

// Rota GET principal — renderiza o arquivo view.ejs
router.get('/', (req, res) => {
    res.render(path.join(__dirname, 'view.ejs'));
});

//  Rota de login (POST)
router.post("/", async (req, res) => {
  try {
    const { email, senha } = req.body; // Recebe email e senha enviados pelo cliente

    // Busca usuário pelo email
    const [rows] = await pool.query("SELECT * FROM usuario WHERE email = ?", [email]);
    const usuarios = rows as any[];

    // Se email não existir no banco
    if (usuarios.length === 0) {
      return res.status(404).json({ message: "Usuário e/ou Senha incorretos." });
    }

    const usuario = usuarios[0];

    // Compara a senha enviada com o hash salvo
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ message: "Usuário e/ou Senha incorretos." });
    }

    // Se tudo ok → gera token JWT com dados do usuário
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email }, // payload
      SECRET,                                                       // chave secreta
      { expiresIn: "2h" }                                           // expira em 2 horas
    );

    // Retorna token pro cliente
    res.json({ message: "Login realizado com sucesso!", token });
  } catch (err) {
    console.error(err); // Log de erro
    res.status(500).json({ message: "Erro no servidor ao fazer login." });
  }
});

// Exporta o router para o servidor principal
export default router;