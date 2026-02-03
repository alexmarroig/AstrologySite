const fs = require('fs');
const path = require('path');

const TEMPLATE_MAP = {
  natal: 'natal.docx',
  solar_return: 'solar_return.docx',
  synastry: 'synastry.docx',
  predictions: 'predictions.docx',
  progressions: 'progressions.docx'
};

const TEMPLATE_NAMES = Object.values(TEMPLATE_MAP);

const buildTemplateContents = (templateName) => {
  const generatedAt = new Date().toISOString();
  return [
    'Astrolumen DOCX Template',
    `Template: ${templateName}`,
    `Generated at: ${generatedAt}`
  ].join('\n');
};

const ensureDocxTemplates = (templatesDir = path.join(__dirname, '..', '..', 'templates')) => {
  fs.mkdirSync(templatesDir, { recursive: true });

  const written = [];
  TEMPLATE_NAMES.forEach((templateName) => {
    const templatePath = path.join(templatesDir, templateName);
    if (!fs.existsSync(templatePath)) {
      fs.writeFileSync(templatePath, buildTemplateContents(templateName), 'utf8');
      written.push(templatePath);
    }
  });

  return {
    templatesDir,
    written,
    available: TEMPLATE_NAMES.map((templateName) => path.join(templatesDir, templateName))
  };
};

if (require.main === module) {
  const { templatesDir, written } = ensureDocxTemplates();
  if (written.length) {
    console.log(`Generated ${written.length} template(s) in ${templatesDir}.`);
  } else {
    console.log(`Templates already exist in ${templatesDir}.`);
  }
}

module.exports = {
  TEMPLATE_MAP,
  TEMPLATE_NAMES,
  ensureDocxTemplates
};
