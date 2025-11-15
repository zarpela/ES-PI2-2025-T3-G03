//Desenvolvido por Murillo Iamarino Caravita
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto'; // Para gerar códigos aleatórios
import transporter from '../config/mailer.ts'; // Importa o transportador de e-mail
import { pool } from "../bd/bd.ts"; // ajuste para caminho correto do seu pool
const router = express.Router();
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Armazenamento em memória para códigos de recuperação (para fins de demonstração)
// Em uma aplicação real, use um banco de dados (ex: Redis) com expiração
const recoveryCodes: { [email: string]: { code: string; expires: number } } = {};

// Rota /usuario/cadastrar que renderiza cadastro.js
router.get('/usuario/cadastrar', (req, res) => {
  res.render(path.join(__dirname, 'cadastro.ejs'));
});

router.get('/usuario/recuperar-senha', (req, res) => {
  res.render(path.join(__dirname, 'senha_recover.ejs'));
});

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
        delete recoveryCodes[email]; // Limpa o código expirado
        return res.status(400).json({ message: 'Código de recuperação expirado. Por favor, solicite um novo.' });
    }

    if (stored.code !== code) {
        return res.status(400).json({ message: 'Código de verificação inválido.' });
    }

    // Código verificado com sucesso
    delete recoveryCodes[email]; // O código só pode ser usado uma vez
    
    // Aqui, você normalmente redirecionaria o usuário para uma página para criar uma nova senha
    // ou retornaria um token que autoriza a alteração da senha.
    res.status(200).json({ message: 'Código verificado com sucesso. Você pode redefinir sua senha.' });
});


export default router;
