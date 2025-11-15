import { Router } from "express";
import { pool } from "../bd/bd";
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

//  Rota de login
router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const [rows] = await pool.query("SELECT * FROM usuario WHERE email = ?", [email]);
    const usuarios = rows as any[];

    if (usuarios.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const usuario = usuarios[0];

    // Compara senha
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    // Gera token JWT
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email },
      SECRET,
      { expiresIn: "2h" }
    );

    res.json({ message: "Login realizado com sucesso!", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor ao fazer login." });
  }
});

export default router;
