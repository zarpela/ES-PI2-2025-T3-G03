const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');


const app = express();
app.use(bodyParser.json());
const cors = require('cors');
app.use(cors());

// Endpoint de teste
app.get('/', (req, res) => {
  res.send('Servidor Node.js rodando!');
});

// Endpoint para "esqueci senha"
app.post('/esqueci-senha', async (req, res) => {
  const { email } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'seuemail@gmail.com', // coloque seu e-mail
      pass: 'sua-app-password'     // senha de app do Gmail
    }
  });

  const link = "http://localhost:3000/resetar-senha?token=ABC123"; // link de exemplo

  console.log("Tentando enviar e-mail para:", email);
  await transporter.sendMail({
    from: '"NotaDez" <seuemail@gmail.com>',
    to: email,
    subject: "Recuperar senha",
    html: `<p>Clique no link para redefinir sua senha: <a href="${link}">${link}</a></p>`
  });
  console.log("Mensagem enviada: %s", info.messageId);

  res.json({ message: "E-mail de recuperação enviado!" });
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
