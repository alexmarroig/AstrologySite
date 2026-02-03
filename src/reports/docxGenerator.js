const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, HeadingLevel } = require('docx');
const contentStore = require('../content/contentStore');

const formatSectionTitle = (sectionId) =>
  sectionId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

// Templates binários são opcionais; este gerador cria o DOCX de forma programática.
const generateReportDocx = async ({
  service,
  clientName,
  resolvedSections,
  outputPath
}) => {
  const reportConfig = contentStore.getReportConfig();
  const sectionsOrder = reportConfig.sections_order?.[service] || Object.keys(resolvedSections);
  const now = new Date().toISOString().split('T')[0];

  const docSections = [
    new Paragraph({ text: `Relatório AstroLumen`, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `Serviço: ${service}` }),
    new Paragraph({ text: `Cliente: ${clientName || 'Cliente'}` }),
    new Paragraph({ text: `Data: ${now}` }),
    new Paragraph({ text: 'Revisado por Camila Veloso' }),
    new Paragraph(' ')
  ];

  sectionsOrder.forEach((sectionId) => {
    const snippets = resolvedSections[sectionId] || [];
    if (!snippets.length) {
      return;
    }
    docSections.push(
      new Paragraph({ text: formatSectionTitle(sectionId), heading: HeadingLevel.HEADING_2 })
    );
    snippets.forEach((snippet) => {
      docSections.push(new Paragraph({ text: snippet.title, heading: HeadingLevel.HEADING_3 }));
      docSections.push(new Paragraph(snippet.text_md));
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docSections
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  const stats = fs.statSync(outputPath);
  return { file_path: outputPath, size_bytes: stats.size };
};

module.exports = {
  generateReportDocx
};
