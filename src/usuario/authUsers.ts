import { Router } from "express";
import { pool } from "../bd/bd.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const router = Router();
const SECRET = "segredo_super_secreto"; // coloque em variável de ambiente (.env)

interface MyJwtPayload extends JwtPayload {
  id: number;
  email: string;
}

// Rota de cadastro
router.post("/cadastro", async (req: Request, res: Response) => {
  try {
    const { nome, email, celular, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Campos obrigatórios não preenchidos." });
    }

    const [users] = await pool.query("SELECT * FROM usuario WHERE email = ?", [email]);
    if ((users as any[]).length > 0) {
      return res.status(400).json({ message: "E-mail já cadastrado." });
    }

    const hash = await bcrypt.hash(senha, 10);

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

router.post("/login", async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    const [users] = await pool.query("SELECT * FROM usuario WHERE email = ?", [email]);
    const user = (users as any[])[0];

    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado." });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "1h" });

    res.json({ message: "Login feito com sucesso!", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor ao fazer login." });
  }
});

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido ou expirado" });

    if (typeof user === "object" && user !== null && "id" in user && "email" in user) {
      req.user = user as MyJwtPayload;
      next();
    } else {
      res.status(403).json({ error: "Token mal formado" });
    }
  });
}

export default router;
