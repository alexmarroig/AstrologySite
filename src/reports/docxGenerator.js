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

const { getReportConfig } = require('../services/content.service');
const { ensureDocxTemplates } = require('../scripts/generate-docx-templates');

const TEMPLATE_MAP = {
  natal: 'natal.docx',
  solar_return: 'solar_return.docx',
  synastry: 'synastry.docx',
  predictions: 'predictions.docx',
  progressions: 'progressions.docx'
};

let templatesReadyPromise;
const ensureTemplatesReady = () => {
  if (!templatesReadyPromise) {
    templatesReadyPromise = ensureDocxTemplates();
  }
  return templatesReadyPromise;
};

const resolveSectionsOrder = (reportConfig, service) => {
  const configuredOrder = reportConfig?.sections_order;
  if (Array.isArray(configuredOrder)) {
    return configuredOrder;
  }
  if (configuredOrder && typeof configuredOrder === 'object') {
    return (
      configuredOrder[service] ||
      configuredOrder.default ||
      configuredOrder.fallback ||
      []
    );
  }
  return [];
};

const stripMarkdown = (value = '') => {
  let output = String(value);
  output = output.replace(/```[\s\S]*?```/g, '');
  output = output.replace(/`([^`]+)`/g, '$1');
  output = output.replace(/\*\*([^*]+)\*\*/g, '$1');
  output = output.replace(/__([^_]+)__/g, '$1');
  output = output.replace(/\*([^*]+)\*/g, '$1');
  output = output.replace(/_([^_]+)_/g, '$1');
  output = output.replace(/#+\s?/g, '');
  output = output.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  output = output.replace(/^[\s>*-]+/gm, '');
  output = output.replace(/\n{3,}/g, '\n\n');
  return output.trim();
};

const formatSectionEntries = (entries = []) =>
  entries
    .map((entry) => {
      const title = stripMarkdown(entry.title || entry.titulo || entry.heading || '');
      const body = stripMarkdown(entry.text_md || entry.text || entry.body || '');
      return [title, body].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');

const buildReportBody = ({ service, clientName, chartData, sectionsOrder, sections }) => {
  const headerLines = [
    'Relatório Astrolumen',
    clientName ? `Cliente: ${clientName}` : null,
    service ? `Serviço: ${service}` : null
  ].filter(Boolean);

  const chartLines = chartData
    ? [
        chartData.birth_date || chartData.birthDate
          ? `Data de nascimento: ${chartData.birth_date || chartData.birthDate}`
          : null,
        chartData.birth_time || chartData.birthTime
          ? `Hora de nascimento: ${chartData.birth_time || chartData.birthTime}`
          : null,
        chartData.birth_location || chartData.birthLocation
          ? `Local de nascimento: ${chartData.birth_location || chartData.birthLocation}`
          : null
      ].filter(Boolean)
    : [];

  const sectionBlocks = sectionsOrder
    .map((sectionKey) => {
      const entries = sections[sectionKey] || [];
      if (!entries.length) {
        return null;
      }
      const title = stripMarkdown(sectionKey.replace(/_/g, ' '));
      const body = formatSectionEntries(entries);
      return [title.toUpperCase(), body].filter(Boolean).join('\n');
    })
    .filter(Boolean);

  const fallbackSections = sectionBlocks.length
    ? []
    : Object.keys(sections).map((sectionKey) => {
        const entries = sections[sectionKey] || [];
        if (!entries.length) {
          return null;
        }
        const title = stripMarkdown(sectionKey.replace(/_/g, ' '));
        const body = formatSectionEntries(entries);
        return [title.toUpperCase(), body].filter(Boolean).join('\n');
      });

  return [
    headerLines.join('\n'),
    chartLines.length ? chartLines.join('\n') : null,
    sectionBlocks.length ? sectionBlocks.join('\n\n') : fallbackSections.filter(Boolean).join('\n\n')
  ]
    .filter(Boolean)
    .join('\n\n');
};

const generateReportDocx = async ({
  service,
  clientName,
  chartData,
  resolvedSections,
  outputPath
}) => {
  await ensureTemplatesReady();
  const reportConfig = getReportConfig();
  const sectionsOrder = resolveSectionsOrder(reportConfig, service);
  const sections = resolvedSections?.sections || resolvedSections || {};

  const body = buildReportBody({
    service,
    clientName,
    chartData,
    sectionsOrder,
    sections
  });

  const templateName = TEMPLATE_MAP[service] || 'natal.docx';
  const templatePath = path.join(__dirname, '..', '..', 'templates', templateName);
  const reportText = [
    `Template: ${templateName}`,
    fs.existsSync(templatePath) ? null : 'Template não encontrado; usando conteúdo padrão.',
    body
  ]
    .filter(Boolean)
    .join('\n\n');

  const resolvedOutputPath = outputPath || path.join(process.cwd(), `${service || 'report'}.docx`);
  fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
  fs.writeFileSync(resolvedOutputPath, reportText, 'utf8');

  const stats = fs.statSync(resolvedOutputPath);
  return {
    file_path: resolvedOutputPath,
    size_bytes: stats.size
  };
};

module.exports = {
  generateReportDocx
};
