const fs = require('fs');
const path = require('path');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');

const db = require('../db');
const { ensureDocxTemplates } = require('../scripts/generate-docx-templates');
const ephemerisService = require('./ephemeris.service');
const interpretationService = require('./interpretation.service');
const llmOptimizedService = require('./llm-optimized.service');
const { resolveSnippets } = require('./snippet-resolver.service');
const storageService = require('./storage.service');

const SERVICE_LABELS = {
  natal_chart: 'Mapa Natal',
  solar_return: 'Retorno Solar',
  synastry: 'Sinastria',
  predictions: 'Previsões',
};

const TEMPLATE_BY_SERVICE = {
  natal_chart: 'natal_chart.docx',
  solar_return: 'solar_return.docx',
  synastry: 'synastry.docx',
  predictions: 'predictions.docx',
};

const normalizeBirthPayload = (body = {}) => ({
  birthDate: body.birthDate || body.birth_date,
  birthTime: body.birthTime || body.birth_time || '12:00',
  birthLocation: body.birthLocation || body.birth_location,
  birthLatitude: body.birthLatitude || body.birth_latitude,
  birthLongitude: body.birthLongitude || body.birth_longitude,
});

const buildLocationPayload = (payload) => {
  if (payload.birthLatitude && payload.birthLongitude) {
    return {
      latitude: Number(payload.birthLatitude),
      longitude: Number(payload.birthLongitude),
      label: payload.birthLocation || 'Local informado',
    };
  }
  return payload.birthLocation;
};

const formatSections = (sections) => {
  if (!sections || !Object.keys(sections).length) {
    return 'Nenhum conteúdo disponível.';
  }
  return Object.entries(sections)
    .map(([section, snippets]) => {
      const title = section.toUpperCase();
      const items = (snippets || [])
        .map((snippet) => `- ${snippet.title || snippet.key || 'Snippet'}`)
        .join('\n');
      return `${title}\n${items || '- Sem itens'}`;
    })
    .join('\n\n');
};

const buildTokensFromChart = (chartData) => {
  const tokens = [];
  if (chartData?.planets) {
    for (const [planet, data] of Object.entries(chartData.planets)) {
      tokens.push(`${planet}_${data.sign}`.toLowerCase());
    }
  }
  if (chartData?.houses) {
    for (const [house, data] of Object.entries(chartData.houses)) {
      tokens.push(`${house}_${data.sign}`.toLowerCase());
    }
  }
  if (chartData?.aspects) {
    for (const aspect of chartData.aspects) {
      tokens.push(
        `aspect_${aspect.planet1}_${aspect.planet2}_${aspect.type}`.toLowerCase()
      );
    }
  }
  return tokens;
};

const buildTokensForSynastry = (synastryData) => {
  const tokens = [];
  if (synastryData?.interAspects) {
    for (const aspect of synastryData.interAspects) {
      tokens.push(
        `synastry_${aspect.planet1}_${aspect.planet2}_${aspect.type}`.toLowerCase()
      );
    }
  }
  return tokens;
};

const buildTokensForPredictions = (predictionData) => {
  const tokens = [];
  for (const transit of predictionData.currentTransits || []) {
    tokens.push(`transit_${transit.planet}_${transit.sign}`.toLowerCase());
  }
  for (const forecast of predictionData.forecasts || []) {
    if (forecast.month) {
      tokens.push(`forecast_${forecast.month}`.toLowerCase());
    }
  }
  for (const critical of predictionData.criticalPeriods || []) {
    if (critical.event) {
      tokens.push(`critical_${critical.event}`.toLowerCase());
    }
  }
  return tokens;
};

const shouldRefineContent = () => process.env.REPORT_REFINE === 'true';

const refineSections = (sections) => {
  if (!shouldRefineContent()) {
    return sections;
  }
  const refined = {};
  for (const [section, snippets] of Object.entries(sections || {})) {
    refined[section] = (snippets || []).slice(0, 3);
  }
  return refined;
};

const renderDocx = (templatePath, data) => {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.render(data);
  return doc.getZip().generate({ type: 'nodebuffer' });
};

const summarizeFallback = (serviceType, payload) => {
  if (serviceType === 'synastry') {
    return `Compatibilidade entre ${payload?.person1?.name || 'Pessoa 1'} e ${
      payload?.person2?.name || 'Pessoa 2'
    }.`;
  }
  if (serviceType === 'predictions') {
    return 'Previsões focadas em ciclos atuais e oportunidades futuras.';
  }
  return 'Relatório astrológico gerado automaticamente com base nos dados informados.';
};

const calculateNatalReport = async (serviceData, userName) => {
  const payload = normalizeBirthPayload(serviceData);
  const locationPayload = buildLocationPayload(payload);
  const chartData = await ephemerisService.calculateNatalChart(
    payload.birthDate,
    payload.birthTime,
    locationPayload
  );
  const interpretations = await interpretationService.getChartInterpretations(chartData);
  let summary = summarizeFallback('natal_chart');
  if (process.env.OPENAI_API_KEY) {
    try {
      summary = await llmOptimizedService.synthesizeNatalChart(
        chartData,
        interpretations,
        userName
      );
    } catch (error) {
      console.warn('Falha ao sintetizar relatório via LLM:', error.message);
    }
  }
  return {
    chartData,
    interpretations,
    summary,
  };
};

const calculateSolarReturnReport = async (serviceData, userName) => {
  const payload = normalizeBirthPayload(serviceData);
  const analysisYear = serviceData.analysisYear || serviceData.analysis_year;
  const locationPayload = buildLocationPayload(payload);
  const solarReturn = await ephemerisService.calculateSolarReturn(
    payload.birthDate,
    payload.birthTime,
    locationPayload,
    analysisYear
  );
  const interpretations = await interpretationService.getChartInterpretations(
    solarReturn.chart
  );
  let summary = summarizeFallback('solar_return');
  if (process.env.OPENAI_API_KEY) {
    try {
      summary = await llmOptimizedService.synthesizeSolarReturn(
        solarReturn.chart,
        interpretations,
        userName
      );
    } catch (error) {
      console.warn('Falha ao sintetizar retorno solar via LLM:', error.message);
    }
  }
  return {
    chartData: solarReturn.chart,
    interpretations,
    summary,
    solarReturnDate: solarReturn.solarReturnDate,
  };
};

const calculateSynastryReport = async (serviceData) => {
  const person1 = serviceData.person1 || {};
  const person2 = serviceData.person2 || {};
  const normalizedPerson1 = normalizeBirthPayload(person1);
  const normalizedPerson2 = normalizeBirthPayload(person2);
  const location1 = buildLocationPayload(normalizedPerson1);
  const location2 = buildLocationPayload(normalizedPerson2);
  const synastry = await ephemerisService.calculateSynastry(
    {
      birthDate: normalizedPerson1.birthDate,
      birthTime: normalizedPerson1.birthTime,
      birthLocation: location1,
    },
    {
      birthDate: normalizedPerson2.birthDate,
      birthTime: normalizedPerson2.birthTime,
      birthLocation: location2,
    }
  );
  const summary = summarizeFallback('synastry', {
    person1,
    person2,
  });
  return {
    synastry,
    summary,
  };
};

const calculatePredictionsReport = async (serviceData) => {
  const payload = normalizeBirthPayload(serviceData);
  const locationPayload = buildLocationPayload(payload);
  const today = new Date();
  const currentChart = await ephemerisService.calculateNatalChart(
    `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(
      today.getUTCDate()
    ).padStart(2, '0')}`,
    '12:00',
    locationPayload
  );
  const currentTransits = Object.entries(currentChart.planets).slice(0, 5).map(
    ([planet, data]) => ({
      planet,
      sign: data.sign,
      current_house: null,
      influence: `${planet} em ${data.sign} traz foco em temas ligados ao signo.`,
    })
  );
  const forecasts = [
    {
      month: today.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
      theme: 'Foco em alinhamento emocional',
      description: 'Período favorável para decisões conscientes e autocuidado.',
      key_dates: [],
      opportunities: ['Expandir conexões', 'Planejar metas pessoais'],
      challenges: ['Evitar impulsos', 'Cuidar do descanso'],
    },
  ];
  const criticalPeriods = [
    {
      date: today.toISOString().split('T')[0],
      event: 'Lua Nova',
      effect: 'Renovação de intenções e projetos pessoais.',
    },
  ];
  const recommendations = [
    'Reserve tempo para organizar prioridades emocionais.',
    'Aproveite o período para fortalecer parcerias de confiança.',
  ];
  return {
    currentTransits,
    forecasts,
    criticalPeriods,
    recommendations,
    summary: summarizeFallback('predictions'),
  };
};

const buildTemplateData = ({ order, summary, tokens, resolved }) => ({
  serviceLabel: SERVICE_LABELS[order.service_type] || order.service_type,
  clientName: order.name || 'Cliente',
  orderNumber: order.order_number,
  createdAt: new Date().toISOString().split('T')[0],
  summary,
  sections: formatSections(resolved?.sections || {}),
  tokens: tokens.length ? tokens.join(', ') : 'Nenhum token identificado.',
});

class ReportService {
  async generateReportDocx(orderId) {
    ensureDocxTemplates(path.join(__dirname, '..', '..', 'templates'));
    const result = await db.query(
      `SELECT orders.*, users.name, users.email
       FROM orders
       JOIN users ON users.id = orders.user_id
       WHERE orders.id = $1`,
      [orderId]
    );
    const order = result.rows[0];
    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    const serviceType = order.service_type;
    const serviceData = order.service_data || {};
    let calculation = null;
    let tokens = [];
    let summary = summarizeFallback(serviceType, serviceData);

    if (serviceType === 'natal_chart') {
      calculation = await calculateNatalReport(serviceData, order.name);
      tokens = buildTokensFromChart(calculation.chartData);
      summary = calculation.summary;
    } else if (serviceType === 'solar_return') {
      calculation = await calculateSolarReturnReport(serviceData, order.name);
      tokens = buildTokensFromChart(calculation.chartData);
      summary = calculation.summary;
    } else if (serviceType === 'synastry') {
      calculation = await calculateSynastryReport(serviceData);
      tokens = buildTokensForSynastry(calculation.synastry);
      summary = calculation.summary;
    } else if (serviceType === 'predictions') {
      calculation = await calculatePredictionsReport(serviceData);
      tokens = buildTokensForPredictions(calculation);
      summary = calculation.summary;
    } else {
      throw new Error('Tipo de serviço inválido');
    }

    const resolved = resolveSnippets(tokens, serviceType, 'v1', []);
    resolved.sections = refineSections(resolved.sections);

    const templateFile = TEMPLATE_BY_SERVICE[serviceType];
    if (!templateFile) {
      throw new Error('Template não encontrado para o serviço');
    }
    const templatePath = path.join(__dirname, '..', '..', 'templates', templateFile);
    const templateData = buildTemplateData({ order, summary, tokens, resolved });
    const docxBuffer = renderDocx(templatePath, templateData);

    const fileName = `report-${order.order_number}-${serviceType}.docx`;
    const storageKey = `reports/${order.id}/${fileName}`;
    const reportUrl = await storageService.uploadReportDocx(docxBuffer, storageKey);

    await db.query(
      `UPDATE orders
       SET report_url = $1, report_file_name = $2, updated_at = NOW()
       WHERE id = $3`,
      [reportUrl, fileName, order.id]
    );

    await db.query(
      `INSERT INTO analyses (order_id, user_id, analysis_type, ephemeris_data, llm_analysis, report_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        order.id,
        order.user_id,
        serviceType,
        JSON.stringify(calculation || {}),
        summary,
        reportUrl,
      ]
    );

    return {
      order_id: order.id,
      report_url: reportUrl,
      report_file_name: fileName,
      service_type: serviceType,
    };
  }
}

module.exports = new ReportService();
