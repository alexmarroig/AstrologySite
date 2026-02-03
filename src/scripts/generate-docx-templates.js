const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const TEMPLATE_TEXTS = {
  'natal_chart.docx': [
    'Relatório Astrológico - {serviceLabel}',
    'Cliente: {clientName}',
    'Pedido: {orderNumber}',
    'Gerado em: {createdAt}',
    '',
    'Resumo',
    '{summary}',
    '',
    'Seções',
    '{sections}',
    '',
    'Tokens',
    '{tokens}',
  ],
  'solar_return.docx': [
    'Relatório de Retorno Solar - {serviceLabel}',
    'Cliente: {clientName}',
    'Pedido: {orderNumber}',
    'Gerado em: {createdAt}',
    '',
    'Resumo',
    '{summary}',
    '',
    'Seções',
    '{sections}',
    '',
    'Tokens',
    '{tokens}',
  ],
  'synastry.docx': [
    'Relatório de Sinastria - {serviceLabel}',
    'Cliente: {clientName}',
    'Pedido: {orderNumber}',
    'Gerado em: {createdAt}',
    '',
    'Resumo',
    '{summary}',
    '',
    'Seções',
    '{sections}',
    '',
    'Tokens',
    '{tokens}',
  ],
  'predictions.docx': [
    'Relatório de Previsões - {serviceLabel}',
    'Cliente: {clientName}',
    'Pedido: {orderNumber}',
    'Gerado em: {createdAt}',
    '',
    'Resumo',
    '{summary}',
    '',
    'Seções',
    '{sections}',
    '',
    'Tokens',
    '{tokens}',
  ],
};

const escapeXml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildDocumentXml = (lines) => {
  const paragraphs = lines.map((line) => {
    const text = escapeXml(line);
    return `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
  });

  const sectPr =
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${paragraphs.join('')}${sectPr}</w:body>` +
    '</w:document>'
  );
};

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ' +
  'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '</Types>';

const RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" ' +
  'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" ' +
  'Target="word/document.xml"/>' +
  '</Relationships>';

const DOCUMENT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';

const writeDocx = (outputPath, lines) => {
  const zip = new PizZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('_rels/.rels', RELS);
  zip.file('word/document.xml', buildDocumentXml(lines));
  zip.file('word/_rels/document.xml.rels', DOCUMENT_RELS);

  const buffer = zip.generate({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, buffer);
};

const ensureDocxTemplates = (outputDir) => {
  fs.mkdirSync(outputDir, { recursive: true });
  Object.entries(TEMPLATE_TEXTS).forEach(([filename, lines]) => {
    const outputPath = path.join(outputDir, filename);
    if (!fs.existsSync(outputPath)) {
      writeDocx(outputPath, lines);
    }
  });
};

if (require.main === module) {
  const outputDir = path.join(__dirname, '..', '..', 'templates');
  ensureDocxTemplates(outputDir);
  console.log('Templates DOCX gerados em', outputDir);
}

module.exports = { ensureDocxTemplates };
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
