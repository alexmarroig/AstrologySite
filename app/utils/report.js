const {
  Document,
  Packer,
  Paragraph,
  Heading,
  Table,
  Row,
  Cell,
  BorderStyle,
  AlignmentType,
  convertInchesToTwip,
} = require('docx');
const fs = require('fs');
const path = require('path');

exports.generateNatalChartReport = async (
  userData,
  chartData,
  analysis,
  reportPreview = null
) => {
  try {
    const doc = new Document({
      sections: [
        {
          children: [
            // CAPA
            new Paragraph({
              text: '🌙 AstroLumen 🌙',
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Heading({
              text: 'Seu Mapa Astral Completo',
              level: 1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            new Paragraph({
              text: `Nome: ${userData.name}`,
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: `Data de Nascimento: ${chartData.date} às ${chartData.time}`,
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: `Local: ${chartData.location}`,
              spacing: { after: 300 },
            }),
            new Paragraph({
              text: `Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`,
              spacing: { after: 600 },
            }),

            // SUMÁRIO EXECUTIVO
            new Heading({
              text: 'Seu Mapa Astral',
              level: 2,
              spacing: { before: 400, after: 200 },
            }),
            new Paragraph({
              text: analysis,
              spacing: { after: 400 },
            }),

            // POSIÇÕES PLANETÁRIAS
            new Heading({
              text: 'Posições Planetárias',
              level: 2,
              spacing: { before: 400, after: 200 },
            }),
            createPlanetsTable(chartData.planets),

            // CASAS ASTROLÓGICAS
            new Heading({
              text: 'Casas Astrológicas',
              level: 2,
              spacing: { before: 400, after: 200 },
            }),
            createHousesTable(chartData.houses),

            // ASPECTOS
            new Heading({
              text: 'Aspectos Astrológicos',
              level: 2,
              spacing: { before: 400, after: 200 },
            }),
            createAspectsTable(chartData.aspects),
            ...(reportPreview?.sections ? buildReportPreviewSections(reportPreview) : []),

            // ASSINATURA
            new Paragraph({
              text: '',
              spacing: { before: 600, after: 100 },
            }),
            new Paragraph({
              text: 'Análise preparada por:',
              spacing: { after: 50 },
            }),
            new Paragraph({
              text: 'Camila Veloso',
              spacing: { after: 50 },
            }),
            new Paragraph({
              text: 'Astróloga Especialista',
              spacing: { after: 200 },
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    throw error;
  }
};

function buildReportPreviewSections(reportPreview) {
  const sectionEntries = Object.entries(reportPreview.sections || {});
  if (!sectionEntries.length) {
    return [];
  }

  const blocks = [
    new Heading({
      text: 'Insights do Relatório',
      level: 2,
      spacing: { before: 400, after: 200 },
    }),
  ];

  for (const [sectionName, snippets] of sectionEntries) {
    if (!snippets || !snippets.length) {
      continue;
    }
    blocks.push(
      new Heading({
        text: sectionName.toUpperCase(),
        level: 3,
        spacing: { before: 300, after: 100 },
      })
    );
    for (const snippet of snippets) {
      blocks.push(
        new Paragraph({
          text: snippet.title,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: snippet.text_md,
          spacing: { after: 200 },
        })
      );
    }
  }

  return blocks;
}

function createPlanetsTable(planets) {
  const rows = [
    new Row({
      cells: [
        new Cell({ children: [new Paragraph('Planeta')] }),
        new Cell({ children: [new Paragraph('Signo')] }),
        new Cell({ children: [new Paragraph('Grau')] }),
        new Cell({ children: [new Paragraph('Retrógrado')] }),
      ],
    }),
  ];

  Object.entries(planets).forEach(([name, data]) => {
    rows.push(
      new Row({
        cells: [
          new Cell({ children: [new Paragraph(name)] }),
          new Cell({ children: [new Paragraph(data.sign)] }),
          new Cell({ children: [new Paragraph(data.degreeInSign)] }),
          new Cell({
            children: [new Paragraph(data.retrograde ? 'Sim' : 'Não')],
          }),
        ],
      })
    );
  });

  return new Table({
    width: { size: 100, type: 'pct' },
    rows,
  });
}

function createHousesTable(houses) {
  const rows = [
    new Row({
      cells: [
        new Cell({ children: [new Paragraph('Casa')] }),
        new Cell({ children: [new Paragraph('Signo')] }),
        new Cell({ children: [new Paragraph('Grau')] }),
      ],
    }),
  ];

  Object.entries(houses).forEach(([house, data]) => {
    rows.push(
      new Row({
        cells: [
          new Cell({ children: [new Paragraph(house)] }),
          new Cell({ children: [new Paragraph(data.sign)] }),
          new Cell({ children: [new Paragraph(data.degreeInSign)] }),
        ],
      })
    );
  });

  return new Table({
    width: { size: 100, type: 'pct' },
    rows,
  });
}

function createAspectsTable(aspects) {
  const rows = [
    new Row({
      cells: [
        new Cell({ children: [new Paragraph('Planeta 1')] }),
        new Cell({ children: [new Paragraph('Tipo')] }),
        new Cell({ children: [new Paragraph('Planeta 2')] }),
        new Cell({ children: [new Paragraph('Orbe')] }),
      ],
    }),
  ];

  aspects.forEach((aspect) => {
    rows.push(
      new Row({
        cells: [
          new Cell({ children: [new Paragraph(aspect.planet1)] }),
          new Cell({ children: [new Paragraph(aspect.type)] }),
          new Cell({ children: [new Paragraph(aspect.planet2)] }),
          new Cell({ children: [new Paragraph(aspect.orb)] }),
        ],
      })
    );
  });

  return new Table({
    width: { size: 100, type: 'pct' },
    rows,
  });
}
