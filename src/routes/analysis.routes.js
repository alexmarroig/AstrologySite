const express = require('express');

const authMiddleware = require('../auth/auth.middleware');
const crypto = require('crypto');

const ephemerisService = require('../services/ephemeris.service');
const interpretationService = require('../services/interpretation.service');
const llmOptimizedService = require('../services/llm-optimized.service');
const analysisCacheService = require('../services/analysis-cache.service');
const { getPricing } = require('../services/pricing.service');
const { tokenizeChart, normalizeServiceType } = require('../services/tokenizer.service');
const { resolveSnippets } = require('../services/snippet-resolver.service');
const contentLibrary = require('../../data/astrolumen_content_v1.json');

const router = express.Router();

const normalizeBirthPayload = (body) => ({
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

const generateAnalysisId = () => crypto.randomUUID();
const CONTENT_VERSION = contentLibrary?.meta?.content_version || 'v1';
const CONTENT_SNIPPETS = contentLibrary?.interpretation_library?.snippets || [];

const buildReportPreview = (chartResult, serviceType) => {
  const normalizedService = normalizeServiceType(serviceType);
  const tokens = tokenizeChart(chartResult, normalizedService);
  const resolved = resolveSnippets(tokens, normalizedService, CONTENT_VERSION, CONTENT_SNIPPETS);
  const resolvedSections = resolved.sections || {};
  const selectedKeys = [];
  const selectedKeysSet = new Set();
  const resolvedPreviewSections = Object.entries(resolvedSections).reduce(
    (acc, [sectionId, snippets]) => {
      acc[sectionId] = (snippets || [])
        .map((snippet) => ({
          title: snippet.title,
          text_md: snippet.text_md,
          key: snippet.key,
        }))
        .filter((snippet) => snippet.title || snippet.text_md || snippet.key);
      for (const snippet of snippets || []) {
        if (snippet?.key && !selectedKeysSet.has(snippet.key)) {
          selectedKeysSet.add(snippet.key);
          selectedKeys.push(snippet.key);
        }
      }
      return acc;
    },
    {}
  );
  return {
    content_version: resolved.content_version,
    tokens,
    sections: resolvedSections,
    resolved_preview: {
      sections: resolvedPreviewSections,
    },
    selected_keys: selectedKeys,
  };
};

router.post('/natal-chart', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const payload = normalizeBirthPayload(req.body);

    if (!payload.birthDate || !payload.birthLocation) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const locationPayload = buildLocationPayload(payload);
    const cacheHash = analysisCacheService.buildHash({
      type: 'natal_chart',
      birthDate: payload.birthDate,
      birthTime: payload.birthTime,
      location: locationPayload,
    });

    const cached = await analysisCacheService.getCachedAnalysis(cacheHash, 'natal_chart');
    if (cached) {
      const reportPreview = buildReportPreview(
        {
          planets: cached.ephemeris_data,
          houses: cached.houses_data,
          aspects: cached.aspects_data,
        },
        'natal'
      );
      return res.json({
        analysis_id: generateAnalysisId(),
        birth_data: {
          date: payload.birthDate,
          time: payload.birthTime,
          location: payload.birthLocation,
        },
        ephemeris: cached.ephemeris_data,
        houses: cached.houses_data,
        aspects: cached.aspects_data,
        interpretations: cached.interpretations,
        report_preview: reportPreview,
        pricing: getPricing('natal_chart'),
        cache: { hit: true },
      });
    }

    const chartData = await ephemerisService.calculateNatalChart(
      payload.birthDate,
      payload.birthTime,
      locationPayload
    );

    const interpretations = await interpretationService.getChartInterpretations(chartData);

    const analysis = await llmOptimizedService.synthesizeNatalChart(
      chartData,
      interpretations,
      req.user.name
    );

    await analysisCacheService.storeCachedAnalysis(cacheHash, 'natal_chart', {
      ephemeris: chartData.planets,
      houses: chartData.houses,
      aspects: chartData.aspects,
      interpretations,
    });

    const reportPreview = buildReportPreview(chartData, 'natal');

    return res.json({
      analysis_id: generateAnalysisId(),
      birth_data: {
        date: payload.birthDate,
        time: payload.birthTime,
        location: payload.birthLocation,
      },
      ephemeris: chartData.planets,
      houses: chartData.houses,
      aspects: chartData.aspects,
      interpretations,
      summary: analysis,
      report_preview: reportPreview,
      pricing: getPricing('natal_chart'),
      cache: { hit: false },
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/solar-return', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const payload = normalizeBirthPayload(req.body);
    const analysisYear = req.body.analysisYear || req.body.analysis_year;

    if (!payload.birthDate || !payload.birthLocation || !analysisYear) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const locationPayload = buildLocationPayload(payload);
    const cacheHash = analysisCacheService.buildHash({
      type: 'solar_return',
      birthDate: payload.birthDate,
      birthTime: payload.birthTime,
      location: locationPayload,
      analysisYear,
    });

    const cached = await analysisCacheService.getCachedAnalysis(cacheHash, 'solar_return');
    if (cached) {
      const reportPreview = buildReportPreview(
        {
          planets: cached.ephemeris_data?.planets || cached.ephemeris_data,
          houses: cached.houses_data,
          aspects: cached.aspects_data,
        },
        'solar_return'
      );
      return res.json({
        analysis_id: generateAnalysisId(),
        birth_data: {
          date: payload.birthDate,
          time: payload.birthTime,
          location: payload.birthLocation,
        },
        solar_return_date: cached.ephemeris_data?.solarReturnDate,
        ephemeris: cached.ephemeris_data?.planets || cached.ephemeris_data,
        houses: cached.houses_data,
        aspects: cached.aspects_data,
        interpretations: cached.interpretations,
        report_preview: reportPreview,
        pricing: getPricing('solar_return'),
        cache: { hit: true },
      });
    }

    const solarReturn = await ephemerisService.calculateSolarReturn(
      payload.birthDate,
      payload.birthTime,
      locationPayload,
      analysisYear
    );

    const interpretations = await interpretationService.getChartInterpretations(
      solarReturn.chart
    );

    await analysisCacheService.storeCachedAnalysis(cacheHash, 'solar_return', {
      ephemeris: {
        solarReturnDate: solarReturn.solarReturnDate,
        planets: solarReturn.chart.planets,
      },
      houses: solarReturn.chart.houses,
      aspects: solarReturn.chart.aspects,
      interpretations,
    });

    const reportPreview = buildReportPreview(solarReturn.chart, 'solar_return');

    return res.json({
      analysis_id: generateAnalysisId(),
      birth_data: {
        date: payload.birthDate,
        time: payload.birthTime,
        location: payload.birthLocation,
      },
      solar_return_date: solarReturn.solarReturnDate,
      ephemeris: solarReturn.chart.planets,
      houses: solarReturn.chart.houses,
      aspects: solarReturn.chart.aspects,
      interpretations,
      report_preview: reportPreview,
      pricing: getPricing('solar_return'),
      cache: { hit: false },
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/synastry', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const person1 = req.body.person1 || {};
    const person2 = req.body.person2 || {};

    if (!person1.birth_date && !person1.birthDate) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }
    if (!person2.birth_date && !person2.birthDate) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const normalizedPerson1 = normalizeBirthPayload(person1);
    const normalizedPerson2 = normalizeBirthPayload(person2);

    const location1 = buildLocationPayload(normalizedPerson1);
    const location2 = buildLocationPayload(normalizedPerson2);

    const cacheHash = analysisCacheService.buildHash({
      type: 'synastry',
      person1: { ...normalizedPerson1, location: location1 },
      person2: { ...normalizedPerson2, location: location2 },
    });

    const cached = await analysisCacheService.getCachedAnalysis(cacheHash, 'synastry');
    if (cached) {
      const reportPreview = buildReportPreview(
        {
          aspects: cached.aspects_data,
        },
        'synastry'
      );
      return res.json({
        analysis_id: generateAnalysisId(),
        person1: cached.ephemeris_data?.person1,
        person2: cached.ephemeris_data?.person2,
        aspects: cached.aspects_data,
        compatibility_areas: cached.ephemeris_data?.compatibilityAreas,
        interpretations: cached.interpretations,
        report_preview: reportPreview,
        pricing: getPricing('synastry'),
        cache: { hit: true },
      });
    }

    if (
      normalizedPerson1.birthDate === normalizedPerson2.birthDate &&
      normalizedPerson1.birthTime === normalizedPerson2.birthTime &&
      JSON.stringify(location1) === JSON.stringify(location2)
    ) {
      return res.status(400).json({ error: 'Dados das pessoas devem ser diferentes' });
    }

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

    const keyAspects = synastry.interAspects.slice(0, 15);
    const interpretations = [];

    for (const aspect of keyAspects) {
      const interp = await interpretationService.getAspectInterpretation(
        aspect.planet1,
        aspect.planet2,
        aspect.type
      );
      if (interp) {
        interpretations.push({
          planet1: aspect.planet1,
          planet2: aspect.planet2,
          aspect: aspect.type,
          orb: aspect.orb,
          interpretation: interp.interpretation,
        });
      }
    }

    const harmonious = keyAspects.filter((aspect) =>
      ['trine', 'sextile', 'conjunction'].includes(aspect.type)
    ).length;
    const challenging = keyAspects.filter((aspect) =>
      ['square', 'opposition', 'quincunx'].includes(aspect.type)
    ).length;
    const baseScore = Math.max(4, Math.min(10, 6 + harmonious - challenging));

    const compatibilityAreas = {
      romance: {
        score: Number((baseScore + 1).toFixed(1)),
        description: 'Compatibilidade emocional e afetiva baseada em aspectos principais.',
      },
      communication: {
        score: Number(baseScore.toFixed(1)),
        description: 'Sinergia mental observada nas conexões entre Mercúrio e Vênus.',
      },
      life_goals: {
        score: Number(Math.max(1, baseScore - 0.5).toFixed(1)),
        description: 'Compatibilidade nos objetivos de vida e ambições compartilhadas.',
      },
      overall: {
        score: Number(baseScore.toFixed(1)),
        description: 'Equilíbrio geral entre atração, desafios e crescimento conjunto.',
      },
    };

    const personSummary1 = {
      name: person1.name || 'Pessoa 1',
      sun_sign: synastry.chart1.planets.sun.sign,
      moon_sign: synastry.chart1.planets.moon.sign,
      ascendant: synastry.chart1.houses.house1?.sign,
    };
    const personSummary2 = {
      name: person2.name || 'Pessoa 2',
      sun_sign: synastry.chart2.planets.sun.sign,
      moon_sign: synastry.chart2.planets.moon.sign,
      ascendant: synastry.chart2.houses.house1?.sign,
    };

    await analysisCacheService.storeCachedAnalysis(cacheHash, 'synastry', {
      ephemeris: {
        person1: personSummary1,
        person2: personSummary2,
        compatibilityAreas,
      },
      houses: {},
      aspects: keyAspects,
      interpretations,
    });

    const reportPreview = buildReportPreview({ aspects: keyAspects }, 'synastry');

    return res.json({
      analysis_id: generateAnalysisId(),
      person1: personSummary1,
      person2: personSummary2,
      aspects: keyAspects,
      compatibility_areas: compatibilityAreas,
      interpretations,
      report_preview: reportPreview,
      pricing: getPricing('synastry'),
      cache: { hit: false },
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/predictions', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const payload = normalizeBirthPayload(req.body);
    const analysisPeriod = req.body.analysisPeriod || req.body.analysis_period || '12_months';

    if (!payload.birthDate || !payload.birthLocation) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const locationPayload = buildLocationPayload(payload);
    const cacheHash = analysisCacheService.buildHash({
      type: 'predictions',
      birthDate: payload.birthDate,
      birthTime: payload.birthTime,
      location: locationPayload,
      analysisPeriod,
    });

    const cached = await analysisCacheService.getCachedAnalysis(cacheHash, 'predictions');
    if (cached) {
      const reportPreview = buildReportPreview(
        {
          current_transits: cached.ephemeris_data?.currentTransits,
        },
        'predictions'
      );
      return res.json({
        analysis_id: generateAnalysisId(),
        birth_data: {
          date: payload.birthDate,
          time: payload.birthTime,
          location: payload.birthLocation,
        },
        current_transits: cached.ephemeris_data?.currentTransits,
        forecasts: cached.ephemeris_data?.forecasts,
        critical_periods: cached.ephemeris_data?.criticalPeriods,
        recommendations: cached.ephemeris_data?.recommendations,
        report_preview: reportPreview,
        pricing: getPricing('predictions'),
        cache: { hit: true },
      });
    }

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

    const months = analysisPeriod === '3_months' ? 3 : analysisPeriod === '6_months' ? 6 : 12;
    const forecasts = Array.from({ length: months }, (_, index) => {
      const forecastDate = new Date(today.getFullYear(), today.getMonth() + index, 1);
      const label = forecastDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      return {
        month: label,
        theme: 'Foco em alinhamento emocional',
        description: 'Período favorável para decisões conscientes e autocuidado.',
        key_dates: [],
        opportunities: ['Expandir conexões', 'Planejar metas pessoais'],
        challenges: ['Evitar impulsos', 'Cuidar do descanso'],
      };
    });

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

    await analysisCacheService.storeCachedAnalysis(cacheHash, 'predictions', {
      ephemeris: {
        currentTransits,
        forecasts,
        criticalPeriods,
        recommendations,
      },
      houses: {},
      aspects: [],
      interpretations: [],
    });

    const reportPreview = buildReportPreview(
      {
        current_transits: currentTransits,
      },
      'predictions'
    );

    return res.json({
      analysis_id: generateAnalysisId(),
      birth_data: {
        date: payload.birthDate,
        time: payload.birthTime,
        location: payload.birthLocation,
      },
      current_transits: currentTransits,
      forecasts,
      critical_periods: criticalPeriods,
      recommendations,
      report_preview: reportPreview,
      pricing: getPricing('predictions'),
      cache: { hit: false },
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/progressions', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const payload = normalizeBirthPayload(req.body);
    const analysisPeriod = req.body.analysisPeriod || req.body.analysis_period;

    if (!payload.birthDate || !payload.birthLocation || !analysisPeriod) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const locationPayload = buildLocationPayload(payload);
    const cacheHash = analysisCacheService.buildHash({
      type: 'progressions',
      birthDate: payload.birthDate,
      birthTime: payload.birthTime,
      location: locationPayload,
      analysisPeriod,
    });

    const cached = await analysisCacheService.getCachedAnalysis(cacheHash, 'progressions');
    if (cached) {
      const reportPreview = buildReportPreview({}, 'progressions');
      return res.json({
        analysis_id: generateAnalysisId(),
        birth_data: {
          date: payload.birthDate,
          time: payload.birthTime,
          location: payload.birthLocation,
        },
        analysis_period: analysisPeriod,
        highlights: cached.ephemeris_data?.highlights,
        recommendations: cached.ephemeris_data?.recommendations,
        report_preview: reportPreview,
        pricing: getPricing('progressions'),
        cache: { hit: true },
      });
    }

    const highlights = [
      'Fase de amadurecimento emocional com foco em escolhas conscientes.',
      'Mudanças internas pedem atenção ao autocuidado e à rotina.',
      'Período favorável para revisar metas pessoais e profissionais.',
    ];

    const recommendations = [
      'Observe padrões repetitivos e busque novas respostas internas.',
      'Reserve tempo para práticas de autoconhecimento.',
    ];

    await analysisCacheService.storeCachedAnalysis(cacheHash, 'progressions', {
      ephemeris: {
        highlights,
        recommendations,
      },
      houses: {},
      aspects: [],
      interpretations: [],
    });

    const reportPreview = buildReportPreview({}, 'progressions');

    return res.json({
      analysis_id: generateAnalysisId(),
      birth_data: {
        date: payload.birthDate,
        time: payload.birthTime,
        location: payload.birthLocation,
      },
      analysis_period: analysisPeriod,
      highlights,
      recommendations,
      report_preview: reportPreview,
      pricing: getPricing('progressions'),
      cache: { hit: false },
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await interpretationService.getStats();
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
