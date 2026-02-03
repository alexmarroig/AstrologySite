const fs = require('fs');
const path = require('path');

const { getReportConfig } = require('../services/content.service');
const { ensureDocxTemplates, TEMPLATE_MAP } = require('../scripts/generate-docx-templates');

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

const generateReportDocx = ({
  service,
  clientName,
  chartData,
  resolvedSections,
  outputPath
}) => {
  ensureDocxTemplates();
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
