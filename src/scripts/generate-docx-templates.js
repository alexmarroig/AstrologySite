const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun } = require('docx');

const TEMPLATE_MAP = {
  natal: 'natal.docx',
  solar_return: 'solar_return.docx',
  synastry: 'synastry.docx',
  predictions: 'predictions.docx',
  progressions: 'progressions.docx'
};

const buildTemplateDoc = (service) =>
  new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Astrolumen - Template de Relatório',
                bold: true
              })
            ]
          }),
          new Paragraph({
            text: `Serviço: ${service}`
          }),
          new Paragraph({
            text: 'Campos sugeridos:'
          }),
          new Paragraph({
            text: '• {{client_name}}'
          }),
          new Paragraph({
            text: '• {{birth_date}}'
          }),
          new Paragraph({
            text: '• {{sections}}'
          })
        ]
      }
    ]
  });

const ensureDocxTemplates = async () => {
  const templatesDir = path.join(__dirname, '..', '..', 'templates');
  fs.mkdirSync(templatesDir, { recursive: true });

  await Promise.all(
    Object.keys(TEMPLATE_MAP).map(async (service) => {
      const templateName = TEMPLATE_MAP[service];
      const filePath = path.join(templatesDir, templateName);
      const doc = buildTemplateDoc(service);
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);
    })
  );
};

if (require.main === module) {
  ensureDocxTemplates().catch((error) => {
    console.error('Falha ao gerar templates DOCX:', error);
    process.exit(1);
  });
}

module.exports = {
  ensureDocxTemplates
};
