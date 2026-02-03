const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');

const db = require('../db');
const ephemerisService = require('../services/ephemeris.service');
const { tokenizeChart, normalizeServiceType } = require('../services/tokenizer.service');
const { resolveSnippets } = require('../services/snippet-resolver.service');
const contentLibrary = require('../../data/astrolumen_content_v1.json');

const CONTENT_VERSION = contentLibrary?.meta?.content_version || 'v1';
const CONTENT_SNIPPETS = contentLibrary?.interpretation_library?.snippets || [];
const REPORT_CONFIG = contentLibrary?.report_config || {};

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

const parseServiceData = (serviceData) => {
  if (!serviceData) {
    return {};
  }
  if (typeof serviceData === 'string') {
    try {
      return JSON.parse(serviceData);
    } catch (error) {
      return {};
    }
  }
  return serviceData;
};

const formatSectionTitle = (sectionKey) =>
  String(sectionKey || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const stripMarkdown = (text) =>
  String(text || '')
    .replace(/[#*_`>]/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const buildDocxContent = ({ order, serviceType, tokens, resolved }) => {
  const paragraphs = [];

  paragraphs.push(
    new Paragraph({
      text: `Relatório do Pedido #${order.order_number || order.id}`,
      heading: HeadingLevel.TITLE,
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Serviço: ', bold: true }),
        new TextRun({ text: serviceType }),
      ],
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Gerado em: ', bold: true }),
        new TextRun({ text: new Date().toISOString() }),
      ],
    })
  );

  if (Array.isArray(tokens) && tokens.length > 0) {
    paragraphs.push(new Paragraph({ text: 'Tokens', heading: HeadingLevel.HEADING_2 }));
    paragraphs.push(new Paragraph(tokens.join(', ')));
  }

  const sections = resolved?.sections || {};
  const sectionEntries = Object.entries(sections);
  if (sectionEntries.length > 0) {
    sectionEntries.forEach(([sectionKey, snippets]) => {
      paragraphs.push(
        new Paragraph({
          text: formatSectionTitle(sectionKey),
          heading: HeadingLevel.HEADING_2,
        })
      );

      if (!Array.isArray(snippets) || snippets.length === 0) {
        paragraphs.push(new Paragraph('Sem conteúdo disponível.'));
        return;
      }

      snippets.forEach((snippet) => {
        const title = stripMarkdown(snippet.title || snippet.key || 'Trecho');
        const text = stripMarkdown(snippet.text_md || snippet.text || '');

        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: title, bold: true })],
          })
        );

        if (text) {
          paragraphs.push(new Paragraph(text));
        }
      });
    });
  }

  return paragraphs;
};

const generateReport = async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const serviceData = parseServiceData(order.service_data);
    const normalizedService = normalizeServiceType(order.service_type);

    let chartResult = null;

    if (normalizedService === 'natal') {
      const payload = normalizeBirthPayload(serviceData);
      if (!payload.birthDate || !payload.birthLocation) {
        return res.status(400).json({ error: 'Dados de nascimento ausentes' });
      }
      chartResult = await ephemerisService.calculateNatalChart(
        payload.birthDate,
        payload.birthTime,
        buildLocationPayload(payload)
      );
    } else if (normalizedService === 'solar_return') {
      const payload = normalizeBirthPayload(serviceData);
      const analysisYear = serviceData.analysisYear || serviceData.analysis_year;
      if (!payload.birthDate || !payload.birthLocation || !analysisYear) {
        return res.status(400).json({ error: 'Dados de retorno solar ausentes' });
      }
      const solarReturn = await ephemerisService.calculateSolarReturn(
        payload.birthDate,
        payload.birthTime,
        buildLocationPayload(payload),
        analysisYear
      );
      chartResult = {
        ...solarReturn.chart,
        solarReturnDate: solarReturn.solarReturnDate,
      };
    } else if (normalizedService === 'synastry') {
      const person1 = normalizeBirthPayload(serviceData.person1 || {});
      const person2 = normalizeBirthPayload(serviceData.person2 || {});
      if (!person1.birthDate || !person2.birthDate || !person1.birthLocation || !person2.birthLocation) {
        return res.status(400).json({ error: 'Dados de sinastria ausentes' });
      }
      const synastry = await ephemerisService.calculateSynastry(
        {
          birthDate: person1.birthDate,
          birthTime: person1.birthTime,
          birthLocation: buildLocationPayload(person1),
        },
        {
          birthDate: person2.birthDate,
          birthTime: person2.birthTime,
          birthLocation: buildLocationPayload(person2),
        }
      );
      chartResult = {
        chart1: synastry.chart1,
        chart2: synastry.chart2,
        interAspects: synastry.interAspects,
      };
    } else if (normalizedService === 'predictions') {
      chartResult = {
        transits:
          serviceData.transits ||
          serviceData.current_transits ||
          serviceData.currentTransits ||
          [],
      };
    } else {
      return res.status(400).json({ error: 'Tipo de serviço inválido' });
    }

    const tokens = tokenizeChart(chartResult, normalizedService);
    const resolved = resolveSnippets(
      tokens,
      normalizedService,
      CONTENT_VERSION,
      CONTENT_SNIPPETS,
      REPORT_CONFIG
    );

    const reportDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
    fs.mkdirSync(reportDir, { recursive: true });

    const fileName = `${orderId}.docx`;
    const reportPath = path.join(reportDir, fileName);

    const doc = new Document({
      sections: [
        {
          children: buildDocxContent({
            order,
            serviceType: normalizedService,
            tokens,
            resolved,
          }),
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(reportPath, buffer);

    const reportUrl = `/uploads/reports/${fileName}`;

    await db.query(
      `UPDATE orders
       SET report_url = $1, report_file_name = $2, updated_at = NOW()
       WHERE id = $3`,
      [reportUrl, fileName, orderId]
    );

    return res.json({ orderId: Number(orderId), report_url: reportUrl });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  generateReport,
};
