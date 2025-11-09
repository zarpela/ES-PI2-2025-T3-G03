import express from 'express';
const router = express.Router();
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from "../bd/bd.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECRET = "segredo_super_secreto"; // depois coloca em variável de ambiente (.env)

router.get('/', (req, res) => {
    res.render(path.join(__dirname, 'view.ejs'));
});

//  Rota de login
router.post("/", async (req, res) => {
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