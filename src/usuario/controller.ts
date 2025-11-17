//Desenvolvido por Murillo Iamarino Caravita
import express from 'express';                // Framework para criar rotas e servidor HTTP
import path from 'path';                      // Manipula caminhos de arquivos/diretórios
import { fileURLToPath } from 'url';          // Necessário para usar __dirname em ES Modules
import crypto from 'crypto';                  // Usado para gerar tokens aleatórios
import transporter from '../services/mailer.service.ts'; // Serviço de envio de emails
import { pool } from "../repository/bd.ts";   // Conexão com o banco (MySQL)
const router = express.Router();              // Cria um roteador do Express
import bcrypt from 'bcryptjs';                // Biblioteca para hashing de senhas

// Converte URL atual em caminho real do arquivo (ESM não tem __dirname por padrão)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Armazena códigos de recuperação em memória (somente para testes, não recomendado em produção)
const recoveryCodes: { [email: string]: { code: string; expires: number } } = {};

// Armazena tokens temporários para redefinição de senha (semelhante ao recoveryCodes)
const resetTokens: { [token: string]: { email: string; expires: number } } = {};

// Rota GET para abrir a página de cadastro
router.get('/usuario/cadastrar', (req, res) => {
  res.render(path.join(__dirname, 'cadastro.ejs'));  // Renderiza o arquivo EJS
});

// Rota GET para página de recuperação de senha
router.get('/usuario/recuperar-senha', (req, res) => {
  res.render(path.join(__dirname, 'senha_recover.ejs'));
});

// Rota GET para página onde o usuário redefine a senha após validar código
router.get('/usuario/redefinir-senha', (req, res) => {
  const { token } = req.query;                       // Token enviado pela URL

  // Valida token
  if (!token || typeof token !== 'string' || !resetTokens[token]) {
    return res.status(400).send('Token inválido ou expirado. Solicite nova recuperação.');
  }

  const registro = resetTokens[token];

  // Verifica expiração do token
  if (Date.now() > registro.expires) {
    delete resetTokens[token];
    return res.status(400).send('Token expirado. Solicite nova recuperação.');
  }

  // Renderiza formulário de redefinição, passando o token
  res.render(path.join(__dirname, 'redefinir_senha.ejs'), { token });
});

// Rota POST para cadastrar usuário
router.post("/cadastrar", async (req, res) => {
  try {
    const { nome, email, celular, senha } = req.body;    // Dados enviados do formulário

    // Verifica campos obrigatórios
    if (!nome || !email || !celular || !senha) {
      return res.status(400).json({ message: "Preencha todos os campos obrigatórios." });
    }

    // Senha precisa ter ao menos 6 caracteres
    if (typeof senha !== 'string' || senha.length < 6) {
      return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres." });
    }

    // Cria hash seguro da senha com salt de custo 10
    const senhaHash = await bcrypt.hash(senha, 10);

    // Insere registro no banco
    const [result] = await pool.query(
      "INSERT INTO usuario (nome, email, celular, senha) VALUES (?, ?, ?, ?)",
      [nome, email, celular, senhaHash]
    );

    return res.status(201).json({ 
      message: "Usuário cadastrado com sucesso!", 
      id: (result as any).insertId 
    });

  } catch (err) {
    console.error("Erro ao cadastrar usuário:", err);
    return res.status(500).json({ message: "Erro ao cadastrar. Tente novamente mais tarde." });
  }
});

// Rota POST que envia código para recuperação de senha
router.post('/usuario/recuperar-senha', async (req, res) => {
    const { email } = req.body;

    // Verifica se email foi enviado
    if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório.' });
    }

    // TODO: Validar existência do email no banco

    // Objeto responsável por gerar o código
    const code = {
      value: '',                    // Código final gerado
      length: 7,                    // Tamanho do código
      characters: {                 // Conjunto de caracteres possíveis
        numbers: '0123456789',
        lowercase:'abcdefghijklmnopqrstuvwxyz',
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      },

      gerar(chars?: string){
        // Se o código já foi gerado antes, reaproveita
        if (this.value) {
          return this.value; 
        }

        let gen = '';

        // Ajusta o tamanho se estiver fora dos limites
        this.length = this.length < 5 || this.length > 50 ? 15 : this.length;

        // Se nenhum charset for especificado, junta todos os tipos
        chars = chars || Object.values(this.characters).join('');

        // Gera o código caracter por caracter
        for (let i = 0; i < this.length; i++){
            gen += chars[Math.floor(Math.random() * chars.length)];
        }

        this.value = gen;
        return gen;
      }
    };

    // Gera o código
    const codeValue = code.gerar();

    // Define expiração para 10 minutos
    const expires = Date.now() + 10 * 60 * 1000;

    // Armazena o código temporariamente
    recoveryCodes[email] = { code: codeValue, expires };

    try {
        // Envia email para o usuário com o código
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

// Rota POST para validar o código digitado pelo usuário
router.post('/usuario/verificar-codigo', (req, res) => {
    const { email, code } = req.body;

    // Verifica campos
    if (!email || !code) {
        return res.status(400).json({ message: 'Email e código são obrigatórios.' });
    }

    const stored = recoveryCodes[email];  // Busca código gerado

    if (!stored) {
        return res.status(400).json({ message: 'Nenhuma solicitação de recuperação encontrada para este e-mail.' });
    }

    // Expirou?
    if (Date.now() > stored.expires) {
        delete recoveryCodes[email];
        return res.status(400).json({ message: 'Código de recuperação expirado. Por favor, solicite um novo.' });
    }

    // Código incorreto?
    if (stored.code !== code) {
        return res.status(400).json({ message: 'Código de verificação inválido.' });
    }

    // Código OK → criar token para redefinição (expira em 15min)
    delete recoveryCodes[email];
    const token = crypto.randomBytes(32).toString('hex');

    resetTokens[token] = { 
      email, 
      expires: Date.now() + 15 * 60 * 1000 
    };

    res.status(200).json({ 
      message: 'Código verificado com sucesso. Redirecionando para redefinição.', 
      resetToken: token 
    });
});

// Rota POST para efetivar a redefinição da senha
router.post('/usuario/redefinir-senha', async (req, res) => {
  try {
    const { token, novaSenha, confirmarSenha } = req.body;

    // Valida campos
    if (!token || !novaSenha || !confirmarSenha) {
      return res.status(400).json({ message: 'Dados incompletos.' });
    }

    // Confirmar senha
    if (novaSenha !== confirmarSenha) {
      return res.status(400).json({ message: 'As senhas não coincidem.' });
    }

    const registro = resetTokens[token];

    // Token inválido
    if (!registro) {
      return res.status(400).json({ message: 'Token inválido.' });
    }

    // Token expirado
    if (Date.now() > registro.expires) {
      delete resetTokens[token];
      return res.status(400).json({ message: 'Token expirado.' });
    }

    // Busca usuário no banco
    const [rows] = await pool.query('SELECT id FROM usuario WHERE email = ?', [registro.email]);
    const user = (rows as any[])[0];

    if (!user) {
      delete resetTokens[token];
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Gera hash da nova senha
    const hash = await bcrypt.hash(novaSenha, 10);

    // Atualiza senha no banco
    await pool.query('UPDATE usuario SET senha = ? WHERE id = ?', [hash, user.id]);

    delete resetTokens[token];  // Remove token após uso

    res.status(200).json({ message: 'Senha redefinida com sucesso.' });

  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({ message: 'Erro interno ao redefinir senha.' });
  }
});

// Exporta o roteador para uso no servidor principal
export default router;