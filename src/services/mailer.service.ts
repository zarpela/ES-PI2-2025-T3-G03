// Desenvolvido por Marcelo

import nodemailer from 'nodemailer';

// Carrega as configurações do ambiente
const mailConfig = {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT), // Converte a porta para número
    secure: process.env.MAIL_PORT === '465', // true se a porta for 465
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
};

// Validação para garantir que as variáveis foram carregadas
if (!mailConfig.auth.user || !mailConfig.auth.pass || !mailConfig.host) {
    console.error('ERRO: As credenciais de e-mail (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS) não foram definidas corretamente no arquivo .env');
}

// Usamos "as any" para contornar a checagem de tipo estrita do TypeScript,
// já que process.env pode retornar 'undefined' e o nodemailer espera 'string'.
// A validação acima ajuda a garantir que os valores existem em tempo de execução.
const transporter = nodemailer.createTransport(mailConfig as any);

export default transporter;