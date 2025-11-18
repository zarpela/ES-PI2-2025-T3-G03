//Desenvolvido por Guilherme Henrique Moreira

// Importa Router para criar rotas no Express
import { Router } from "express";
// Importa conexão com o banco de dados
import { pool } from "../repository/bd.ts";
// Biblioteca para criptografar senhas
import bcrypt from "bcryptjs";
// Biblioteca para gerar e validar tokens JWT
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
// Tipos do Express
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Chave secreta usada para assinar tokens (ideal mover para .env)
const SECRET = "segredo_super_secreto";

// Interface para tipar o payload do JWT contendo id e email
interface MyJwtPayload extends JwtPayload {
  id: number;
  email: string;
}

// Rota de cadastro de usuário
router.post("/cadastro", async (req: Request, res: Response) => {
  try {
    const { nome, email, celular, senha } = req.body;

    // Verifica campos obrigatórios
    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Campos obrigatórios não preenchidos." });
    }

    // Verifica se e-mail já existe
    const [users] = await pool.query("SELECT * FROM usuario WHERE email = ?", [email]);
    if ((users as any[]).length > 0) {
      return res.status(400).json({ message: "E-mail já cadastrado." });
    }

    // Criptografa senha
    const hash = await bcrypt.hash(senha, 10);

    // Insere novo usuário
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

// Rota de login
router.post("/login", async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  // Verifica campos obrigatórios
  if (!email || !senha) {
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    // Busca usuário pelo email
    const [users] = await pool.query("SELECT * FROM usuario WHERE email = ?", [email]);
    const user = (users as any[])[0];

    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado." });
    }

    // Compara senha digitada com hash salvo
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    // Gera token JWT com expiração de 1h
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "1h" });

    res.json({ message: "Login feito com sucesso!", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor ao fazer login." });
  }
});

// Middleware para autenticar rotas protegidas
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Formato: "Bearer token"

  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  // Verifica se token é válido
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido ou expirado" });

    // Garante que o token contém id e email antes de salvar no req
    if (typeof user === "object" && user !== null && "id" in user && "email" in user) {
      req.user = user as MyJwtPayload; // Armazena o usuário no req
      next(); // prossegue para a próxima função
    } else {
      res.status(403).json({ error: "Token mal formado" });
    }
  });
}

export default router;
