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

  async sendAstrologerOrderEmail(payload) {
    const {
      to,
      orderNumber,
      clientName,
      clientEmail,
      clientPhone,
      serviceLabel,
      servicePrice,
      orderDate,
      birthDataSummary,
      adminLink,
      reportUrl,
    } = payload;

    return transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: `[NOVO] ${serviceLabel} - ${clientName} - Pedido #${orderNumber}`,
      text: `📋 NOVO PEDIDO RECEBIDO

🔹 DADOS DO CLIENTE:
Nome: ${clientName}
Email: ${clientEmail}
Telefone: ${clientPhone || 'Não informado'}
Data registro: ${orderDate}

🔹 SERVIÇO SOLICITADO:
Tipo: ${serviceLabel}
Preço: ${servicePrice}
Data pedido: ${orderDate}

🔹 DADOS ASTROLÓGICOS:
${birthDataSummary}

🔹 PRAZO DE ENTREGA:
Link para marcar como pronto: ${adminLink}

📎 RELATÓRIO:
${reportUrl || 'Será gerado automaticamente.'}

---
Sistema: AstroLumen
Não responda este email - é automatizado.`,
    });
  }

  async sendClientCompletionEmail(payload) {
    const { to, clientName, serviceLabel, orderNumber, reportUrl, dashboardUrl } = payload;

    return transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: `✨ Sua análise astrológica está pronta! - Pedido #${orderNumber}`,
      text: `Olá ${clientName}! 👋

Sua análise astrológica foi concluída! 🌙

📊 DETALHES DO SEU PEDIDO:
Serviço: ${serviceLabel}
Pedido: #${orderNumber}
Status: ✅ CONCLUÍDO

📥 ACESSE SEU RELATÓRIO:
${reportUrl}

Ou acesse seu dashboard: ${dashboardUrl}

---
O relatório foi elaborado especialmente para você pela astróloga Camila Veloso,
com análise profunda de sua carta natal e interpretações personalizadas.

✨ Aproveite os insights para sua vida!

Dúvidas? Responda este email.

Namastê,
Camila Veloso
Astróloga Profissional`,
    });
  }
}

module.exports = new EmailService();
