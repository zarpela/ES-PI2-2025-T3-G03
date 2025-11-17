//Desenvolvido por Murillo Iamarino Caravita
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto'; // Para gerar códigos aleatórios
import transporter from '../services/mailer.service.ts'; // Importa o transportador de e-mail
import { pool } from "../repository/bd.ts"; // ajuste para caminho correto do seu pool
const router = express.Router();
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Armazenamento em memória para códigos de recuperação (para fins de demonstração)
// Em uma aplicação real, use um banco de dados (ex: Redis) com expiração
const recoveryCodes: { [email: string]: { code: string; expires: number } } = {};
// Armazenamento temporário para tokens de redefinição de senha
const resetTokens: { [token: string]: { email: string; expires: number } } = {};

// Rota /usuario/cadastrar que renderiza cadastro.js
router.get('/usuario/cadastrar', (req, res) => {
  res.render(path.join(__dirname, 'cadastro.ejs'));
});

router.get('/usuario/recuperar-senha', (req, res) => {
  res.render(path.join(__dirname, 'senha_recover.ejs'));
});

// Formulário para redefinir senha após verificação de código
router.get('/usuario/redefinir-senha', (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string' || !resetTokens[token]) {
    return res.status(400).send('Token inválido ou expirado. Solicite nova recuperação.');
  }
  const registro = resetTokens[token];
  if (Date.now() > registro.expires) {
    delete resetTokens[token];
    return res.status(400).send('Token expirado. Solicite nova recuperação.');
  }
  res.render(path.join(__dirname, 'redefinir_senha.ejs'), { token });
});

// Rota POST para cadastrar usuário
router.post("/cadastrar", async (req, res) => {
  try {
    const { nome, email, celular, senha } = req.body;

    if (!nome || !email || !celular || !senha) {
      return res.status(400).json({ message: "Preencha todos os campos obrigatórios." });
    }

    // Gera o hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Insere o usuário no banco
    const [result] = await pool.query(
      "INSERT INTO usuario (nome, email, celular, senha) VALUES (?, ?, ?, ?)",
      [nome, email, celular, senhaHash]
    );

    return res.status(201).json({ message: "Usuário cadastrado com sucesso!", id: (result as any).insertId });
  } catch (err) {
    console.error("Erro ao cadastrar usuário:", err);
    return res.status(500).json({ message: "Erro ao cadastrar. Tente novamente mais tarde." });
  }
});



// Rota para iniciar a recuperação de senha (enviar código)
router.post('/usuario/recuperar-senha', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório.' });
    }

    // TODO: Verificar se o email existe no banco de dados

    // Gera um código de 6 dígitos
    const code = {
    value: '',
    length: 7,
    characters: {
    numbers: '0123456789',
    lowercase:'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    },

      gerar(chars?: string){
        // Se houver código, retornar o código já gerado
        if (this.value) {
          return this.value; 
        }

        // Gerar código
        let gen = '';

        this.length = this.length < 5 || this.length > 50 ? 15 : this.length

        chars = chars || Object.values(this.characters).join('');

        for (let i = 0; i < this.length; i++){
            gen += chars[Math.floor(Math.random() * chars.length)]
        }
        this.value = gen;
        return gen;
      }
      
    };

    // Gera o código
    const codeValue = code.gerar();
    const expires = Date.now() + 10 * 60 * 1000; 

    // Armazena o código gerado
    recoveryCodes[email] = { code: codeValue, expires };

    try {
        await transporter.sendMail({
            from: '"NotaDez" <seu-email-de-envio@example.com>',
            to: email,
            subject: 'Seu Código de Recuperação de Senha',
            html: `
            <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                <h2>Recuperação de Senha - NotaDez</h2>
                <p>Você solicitou a recuperação de sua senha. Use o código abaixo para continuar:</p>
                <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; background: #f0f0f0; padding: 10px; border-radius: 5px;">
                ${codeValue}
                </p>
                <p>Este código expira em 10 minutos.</p>
                <p>Se você não solicitou a recuperação de senhas, por favor, ignore este e-mail.</p>
            </div>
            `,
        });
        console.log(`E-mail de recuperação enviado para ${email}`);
        console.log(`${codeValue}`);
        res.status(200).json({ message: 'Um código de recuperação foi enviado para o seu e-mail.' });
    
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        return res.status(500).json({ message: 'Não foi possível enviar o e-mail de recuperação. Verifique as configurações do servidor.' });
    }

});

// Rota para verificar o código e permitir a redefinição da senha
router.post('/usuario/verificar-codigo', (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ message: 'Email e código são obrigatórios.' });
    }

    const stored = recoveryCodes[email];

    if (!stored) {
        return res.status(400).json({ message: 'Nenhuma solicitação de recuperação encontrada para este e-mail.' });
    }

    if (Date.now() > stored.expires) {
        delete recoveryCodes[email];
        return res.status(400).json({ message: 'Código de recuperação expirado. Por favor, solicite um novo.' });
    }

    if (stored.code !== code) {
        return res.status(400).json({ message: 'Código de verificação inválido.' });
    }

    // Código verificado: gera token de redefinição válido por 15 minutos
    delete recoveryCodes[email];
    const token = crypto.randomBytes(32).toString('hex');
    resetTokens[token] = { email, expires: Date.now() + 15 * 60 * 1000 };
    res.status(200).json({ message: 'Código verificado com sucesso. Redirecionando para redefinição.', resetToken: token });
});

// Rota POST para efetivar redefinição de senha
router.post('/usuario/redefinir-senha', async (req, res) => {
  try {
    const { token, novaSenha, confirmarSenha } = req.body;
    if (!token || !novaSenha || !confirmarSenha) {
      return res.status(400).json({ message: 'Dados incompletos.' });
    }
    if (novaSenha !== confirmarSenha) {
      return res.status(400).json({ message: 'As senhas não coincidem.' });
    }
    const registro = resetTokens[token];
    if (!registro) {
      return res.status(400).json({ message: 'Token inválido.' });
    }
    if (Date.now() > registro.expires) {
      delete resetTokens[token];
      return res.status(400).json({ message: 'Token expirado.' });
    }
    // Verificar se email existe
    const [rows] = await pool.query('SELECT id FROM usuario WHERE email = ?', [registro.email]);
    const user = (rows as any[])[0];
    if (!user) {
      delete resetTokens[token];
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    const hash = await bcrypt.hash(novaSenha, 10);
    await pool.query('UPDATE usuario SET senha = ? WHERE id = ?', [hash, user.id]);
    delete resetTokens[token];
    res.status(200).json({ message: 'Senha redefinida com sucesso.' });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({ message: 'Erro interno ao redefinir senha.' });
  }
});


export default router;
