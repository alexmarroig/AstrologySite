const path = require('path');
const fs = require('fs');
const db = require('../db');
const ephemerisService = require('../services/ephemeris.service');
const { generateReportDocx } = require('./docxGenerator');
const { resolveSnippets } = require('../engine/resolver');
const {
  tokenizeNatal,
  tokenizeSolarReturn,
  tokenizeSynastry,
  tokenizePredictions,
  tokenizeProgressions
} = require('../engine/tokenizer');
const contentStore = require('../content/contentStore');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'uploads', 'reports');

const mapServiceType = (serviceType) => {
  const mapping = {
    natal_chart: 'natal',
    solar_return: 'solar_return',
    synastry: 'synastry',
    predictions: 'predictions',
    progressions: 'progressions'
  };
  return mapping[serviceType] || serviceType;
};

const buildPreview = (service, tokens) => {
  const contentVersion = contentStore.getMeta().content_version || 'v1';
  const resolved = resolveSnippets({ tokens, service, contentVersion });
  const preview = {};
  Object.entries(resolved.sections || {}).forEach(([sectionId, snippets]) => {
    preview[sectionId] = snippets.map((snippet) => ({
      key: snippet.key,
      title: snippet.title,
      text_md: snippet.text_md
    }));
  });
  return { resolved, preview, contentVersion };
};

const generateReportForOrder = async (order) => {
  const serviceType = mapServiceType(order.service_type);
  const serviceData = typeof order.service_data === 'string'
    ? JSON.parse(order.service_data)
    : order.service_data || {};

  let tokens = [];
  let resolvedSections = {};

  if (serviceType === 'natal') {
    const chart = await ephemerisService.calculateNatalChart(
      serviceData.birth_date || serviceData.birthDate,
      serviceData.birth_time || serviceData.birthTime || '12:00',
      serviceData.birth_location || serviceData.birthLocation
    );
    tokens = tokenizeNatal(chart);
    ({ preview: resolvedSections } = buildPreview(serviceType, tokens));
  } else if (serviceType === 'solar_return') {
    const analysisYear = serviceData.analysis_year || serviceData.analysisYear;
    const solarReturn = await ephemerisService.calculateSolarReturn(
      serviceData.birth_date || serviceData.birthDate,
      serviceData.birth_time || serviceData.birthTime || '12:00',
      serviceData.birth_location || serviceData.birthLocation,
      analysisYear
    );
    tokens = tokenizeSolarReturn(solarReturn.chart);
    ({ preview: resolvedSections } = buildPreview(serviceType, tokens));
  } else if (serviceType === 'synastry') {
    const person1 = serviceData.person1 || {};
    const person2 = serviceData.person2 || {};
    const synastry = await ephemerisService.calculateSynastry(
      {
        birthDate: person1.birth_date || person1.birthDate,
        birthTime: person1.birth_time || person1.birthTime || '12:00',
        birthLocation: person1.birth_location || person1.birthLocation
      },
      {
        birthDate: person2.birth_date || person2.birthDate,
        birthTime: person2.birth_time || person2.birthTime || '12:00',
        birthLocation: person2.birth_location || person2.birthLocation
      }
    );
    tokens = tokenizeSynastry({ aspects: synastry.interAspects });
    ({ preview: resolvedSections } = buildPreview(serviceType, tokens));
  } else if (serviceType === 'predictions') {
    const today = new Date();
    const referenceDate = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(
      2,
      '0'
    )}-${String(today.getUTCDate()).padStart(2, '0')}`;
    const transitResult = await ephemerisService.calculateTransits(
      serviceData.birth_date || serviceData.birthDate,
      serviceData.birth_time || serviceData.birthTime || '12:00',
      serviceData.birth_location || serviceData.birthLocation,
      referenceDate
    );
    tokens = tokenizePredictions({
      transits: transitResult.transits,
      window: `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`
    });
    ({ preview: resolvedSections } = buildPreview(serviceType, tokens));
  } else if (serviceType === 'progressions') {
    const progressions = await ephemerisService.calculateProgressions(
      serviceData.birth_date || serviceData.birthDate,
      serviceData.birth_time || serviceData.birthTime || '12:00',
      serviceData.birth_location || serviceData.birthLocation,
      serviceData.analysis_period || serviceData.analysisPeriod
    );
    tokens = tokenizeProgressions({
      planets: progressions.progressed.planets,
      aspects: progressions.aspects
    });
    ({ preview: resolvedSections } = buildPreview(serviceType, tokens));
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `${order.id}.docx`);

  const result = await generateReportDocx({
    service: serviceType,
    clientName: order.user_name || order.name || 'Cliente',
    resolvedSections,
    outputPath
  });

  const reportUrl = `/uploads/reports/${order.id}.docx`;
  await db.query('UPDATE orders SET report_url = $1 WHERE id = $2', [reportUrl, order.id]);

  return { reportUrl, filePath: result.file_path };
};

module.exports = {
  generateReportForOrder
};
