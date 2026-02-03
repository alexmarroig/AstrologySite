const db = require('../../db');
const { generateReportForOrder } = require('../../reports/reportService');
const path = require('path');
const fs = require('fs');
const db = require('../../db');
const ephemerisService = require('../../services/ephemeris.service');
const { generateReportDocx } = require('../../reports/docxGenerator');
const { resolveSnippets } = require('../../engine/resolver');
const {
  tokenizeNatal,
  tokenizeSolarReturn,
  tokenizeSynastry,
  tokenizePredictions,
  tokenizeProgressions
} = require('../../engine/tokenizer');
const contentStore = require('../../content/contentStore');

const OUTPUT_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'reports');

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

const generateReport = async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const { reportUrl, filePath } = await generateReportForOrder(order);

    return res.json({ orderId, report_url: reportUrl, file_path: filePath });
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
      const currentChart = await ephemerisService.calculateNatalChart(
        `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(
          today.getUTCDate()
        ).padStart(2, '0')}`,
        '12:00',
        serviceData.birth_location || serviceData.birthLocation
      );
      const transits = Object.entries(currentChart.planets).slice(0, 5).map(
        ([planet, data]) => ({
          planet,
          target: 'sun',
          aspect: 'conjunct',
          house: data.house || null
        })
      );
      tokens = tokenizePredictions({ transits });
      ({ preview: resolvedSections } = buildPreview(serviceType, tokens));
    } else if (serviceType === 'progressions') {
      tokens = tokenizeProgressions({});
      ({ preview: resolvedSections } = buildPreview(serviceType, tokens));
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const outputPath = path.join(OUTPUT_DIR, `${orderId}.docx`);

    const result = await generateReportDocx({
      service: serviceType,
      clientName: order.user_name || 'Cliente',
      resolvedSections,
      outputPath
    });

    const reportUrl = `/uploads/reports/${orderId}.docx`;
    await db.query('UPDATE orders SET report_url = $1 WHERE id = $2', [reportUrl, orderId]);

    return res.json({ orderId, report_url: reportUrl, file_path: result.file_path });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  generateReport
};
