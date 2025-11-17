// Desenvolvido por Guilherme Henrique Moreira

import { Router } from "express";
import { pool } from "../repository/bd.ts";         // Conexão com o banco MySQL
import bcrypt from "bcryptjs";                     // Biblioteca para hash de senhas
import jwt from "jsonwebtoken";                    // Biblioteca para geração e validação de tokens JWT
import type { JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

// Criando o router do Express
const router = Router();

// ⚠️ A chave secreta deveria estar em variáveis de ambiente (.env)
const SECRET = "segredo_super_secreto";

// Interface para representar o formato esperado dentro do token JWT
interface MyJwtPayload extends JwtPayload {
  id: number;
  email: string;
}

/* ===========================================================
   📌 ROTA DE CADASTRO DE USUÁRIO
   POST /usuario/cadastro
   =========================================================== */
router.post("/cadastro", async (req: Request, res: Response) => {
  try {
    const { nome, email, celular, senha } = req.body;

    // Checa se os campos obrigatórios foram enviados
    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Campos obrigatórios não preenchidos." });
    }

    // Validação: senha deve ter pelo menos 6 caracteres
    if (typeof senha !== "string" || senha.length < 6) {
      return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres." });
    }

    // Verifica se o e-mail já está cadastrado
    const [users] = await pool.query("SELECT * FROM usuario WHERE email = ?", [email]);
    if ((users as any[]).length > 0) {
      return res.status(400).json({ message: "E-mail já cadastrado." });
    }

    // Gera o hash da senha com bcrypt
    const hash = await bcrypt.hash(senha, 10);

    // Grava o usuário no banco de dados
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

/* ===========================================================
   🔐 ROTA DE LOGIN DE USUÁRIO
   POST /usuario/login
   =========================================================== */
router.post("/login", async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  // Verifica se os campos foram enviados
  if (!email || !senha) {
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    // Busca o usuário pelo e-mail
    const [users] = await pool.query("SELECT * FROM usuario WHERE email = ?", [email]);
    const user = (users as any[])[0];

    // Se o usuário não existe → erro
    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado." });
    }

    // Compara a senha enviada com o hash armazenado
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    // Gera o token JWT contendo ID e email
    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET,
      { expiresIn: "1h" } // expira em 1 hora
    );

    res.json({ message: "Login feito com sucesso!", token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor ao fazer login." });
  }
});

/* ===========================================================
   🛡️ MIDDLEWARE DE AUTENTICAÇÃO JWT
   Valida o token antes de permitir acesso a rotas protegidas
   =========================================================== */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {

  // Pega o header: Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // separa "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  // Verifica se o token é válido
  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido ou expirado" });
    }

    // Garante que o token contém id e email
    if (typeof user === "object" && user !== null && "id" in user && "email" in user) {
      req.user = user as MyJwtPayload; // Adiciona os dados do token na requisição
      next(); // Continua para a rota protegida
    } else {
      res.status(403).json({ error: "Token mal formado" });
    }
  });
}

export default router;
