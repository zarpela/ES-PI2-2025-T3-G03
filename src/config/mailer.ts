import nodemailer from 'nodemailer';

// ATENÇÃO: Configure suas credenciais de e-mail aqui.
// Para um projeto real, use variáveis de ambiente (com um pacote como `dotenv`)
// para manter essas informações seguras e fora do código.

// Exemplo para o Gmail (requer "autenticação em duas etapas" e uma "senha de app")
// Veja como gerar uma senha de app: https://support.google.com/accounts/answer/185833
const mailConfig = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true para 465, false para outras portas
    auth: {
        user: 'notadezt03@gmail.com',
        pass: 'lfczudvfittkwdon'      
    }
};

// Se você usar outro provedor (Outlook, etc.), as configurações de host, porta e secure podem mudar.

const transporter = nodemailer.createTransport(mailConfig);

export default transporter;
