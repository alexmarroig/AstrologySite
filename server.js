const app = require('./src/app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
const { ensureDocxTemplates } = require('./src/scripts/generate-docx-templates');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await ensureDocxTemplates();
  app.listen(PORT, () => {
    console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Falha ao inicializar o servidor:', error);
  process.exit(1);
});
