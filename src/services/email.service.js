const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

class EmailService {
  async sendWelcomeEmail(to, name) {
    return transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: 'Bem-vindo ao Astrolumen',
      text: `Olá ${name}, seja bem-vindo ao Astrolumen!`,
    });
  }

  async sendReportLink(to, reportUrl) {
    return transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: 'Seu relatório Astrolumen está pronto',
      text: `Aqui está o link do seu relatório: ${reportUrl}`,
    });
  }
}

module.exports = new EmailService();
