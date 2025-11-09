import { Router } from "express";
import { pool } from "../bd/bd.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
const SECRET = "segredo_super_secreto"; // depois coloca em variável de ambiente (.env)

//  Rota de cadastro
router.post("/cadastro", async (req, res) => {
  try {
    const { nome, email, celular, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Campos obrigatórios não preenchidos." });
    }

    // Verifica se o e-mail já existe
    const [users] = await pool.query("SELECT * FROM usuario WHERE email = ?", [email]);
    if ((users as any[]).length > 0) {
      return res.status(400).json({ message: "E-mail já cadastrado." });
    }

    // Criptografa a senha
    const hash = await bcrypt.hash(senha, 10);

    // Insere no banco
    await pool.query(
      "INSERT INTO usuario (nome, email, celular, senha) VALUES (?, ?, ?, ?)",
      [nome, email, celular, hash]
    );

    res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor ao cadastrar usuário." });
  }
});

export default router;
