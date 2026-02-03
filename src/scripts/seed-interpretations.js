const db = require('../db');

const planets = [
  { key: 'sun', name: 'Sol', theme: 'identidade, vitalidade e propósito' },
  { key: 'moon', name: 'Lua', theme: 'emoções, necessidades e memórias' },
  { key: 'mercury', name: 'Mercúrio', theme: 'mente, comunicação e aprendizado' },
  { key: 'venus', name: 'Vênus', theme: 'afetos, beleza e relações' },
  { key: 'mars', name: 'Marte', theme: 'ação, desejo e coragem' },
  { key: 'jupiter', name: 'Júpiter', theme: 'expansão, fé e oportunidades' },
  { key: 'saturn', name: 'Saturno', theme: 'estrutura, limites e maturidade' },
  { key: 'uranus', name: 'Urano', theme: 'inovação, liberdade e mudanças' },
  { key: 'neptune', name: 'Netuno', theme: 'imaginação, espiritualidade e compaixão' },
  { key: 'pluto', name: 'Plutão', theme: 'transformação, poder e renascimento' },
  { key: 'north node', name: 'Nó Norte', theme: 'caminho evolutivo e propósito de vida' },
];

const signs = [
  { name: 'Aries', element: 'Fogo', modality: 'Cardinal', keywords: 'iniciativa, coragem' },
  { name: 'Taurus', element: 'Terra', modality: 'Fixo', keywords: 'estabilidade, prazer' },
  { name: 'Gemini', element: 'Ar', modality: 'Mutável', keywords: 'curiosidade, comunicação' },
  { name: 'Cancer', element: 'Água', modality: 'Cardinal', keywords: 'cuidado, sensibilidade' },
  { name: 'Leo', element: 'Fogo', modality: 'Fixo', keywords: 'expressão, liderança' },
  { name: 'Virgo', element: 'Terra', modality: 'Mutável', keywords: 'serviço, precisão' },
  { name: 'Libra', element: 'Ar', modality: 'Cardinal', keywords: 'harmonia, diplomacia' },
  { name: 'Scorpio', element: 'Água', modality: 'Fixo', keywords: 'intensidade, profundidade' },
  { name: 'Sagittarius', element: 'Fogo', modality: 'Mutável', keywords: 'expansão, aventura' },
  { name: 'Capricorn', element: 'Terra', modality: 'Cardinal', keywords: 'disciplina, ambição' },
  { name: 'Aquarius', element: 'Ar', modality: 'Fixo', keywords: 'originalidade, coletividade' },
  { name: 'Pisces', element: 'Água', modality: 'Mutável', keywords: 'empatia, imaginação' },
];

const houses = [
  { number: 1, theme: 'identidade, corpo e primeira impressão' },
  { number: 2, theme: 'recursos, valores e segurança material' },
  { number: 3, theme: 'comunicação, estudos e irmandade' },
  { number: 4, theme: 'família, raízes e intimidade' },
  { number: 5, theme: 'criatividade, prazer e autoexpressão' },
  { number: 6, theme: 'rotina, trabalho e saúde' },
  { number: 7, theme: 'parcerias, contratos e relacionamentos' },
  { number: 8, theme: 'transformação, partilhas e profundidade' },
  { number: 9, theme: 'visão de mundo, fé e viagens' },
  { number: 10, theme: 'carreira, reputação e propósito público' },
  { number: 11, theme: 'amizades, redes e futuro' },
  { number: 12, theme: 'inconsciente, espiritualidade e cura' },
];

const aspectTypes = [
  { type: 'conjunction', quality: 'favorable', tone: 'união poderosa' },
  { type: 'opposition', quality: 'tense', tone: 'polaridade que pede equilíbrio' },
  { type: 'square', quality: 'tense', tone: 'tensão criativa para crescimento' },
  { type: 'trine', quality: 'favorable', tone: 'fluxo natural e apoio' },
  { type: 'sextile', quality: 'favorable', tone: 'oportunidade com esforço consciente' },
  { type: 'quincunx', quality: 'tense', tone: 'ajuste sutil e refinamento' },
  { type: 'semisextile', quality: 'favorable', tone: 'complemento discreto e aprendizado' },
  { type: 'semisquare', quality: 'tense', tone: 'incômodo produtivo e ação' },
  { type: 'sesquiquadrate', quality: 'tense', tone: 'pressão para reorganizar' },
  { type: 'quintile', quality: 'favorable', tone: 'talento especial e criatividade' },
  { type: 'biquintile', quality: 'favorable', tone: 'expressão elevada e maestria' },
];

const planetSignData = planets.flatMap((planet) =>
  signs.map((sign) => ({
    planet: planet.key,
    sign: sign.name,
    interpretation: `${planet.name} em ${sign.name} combina ${planet.theme} com ${sign.keywords}. Elemento ${sign.element} e modalidade ${sign.modality} destacam como você expressa ${planet.theme}. Desafio: equilibrar ${planet.theme} com consciência e presença.`,
    keywords: `${planet.key},${sign.name},${sign.element}`,
  }))
);

const houseData = houses.flatMap((house) =>
  signs.map((sign) => ({
    house_number: house.number,
    sign: sign.name,
    interpretation: `Casa ${house.number} em ${sign.name} colore ${house.theme} com ${sign.keywords}. O elemento ${sign.element} dá o tom, enquanto a modalidade ${sign.modality} indica o ritmo dessas áreas da vida.`,
    keywords: `casa${house.number},${sign.name},${sign.element}`,
  }))
);

const aspectData = [];
for (let i = 0; i < planets.length; i += 1) {
  for (let j = i + 1; j < planets.length; j += 1) {
    const planet1 = planets[i];
    const planet2 = planets[j];
    for (const aspect of aspectTypes) {
      aspectData.push({
        planet1: planet1.key,
        planet2: planet2.key,
        aspect_type: aspect.type,
        interpretation: `${planet1.name} e ${planet2.name} em ${aspect.type} indicam ${aspect.tone}. Há uma dinâmica entre ${planet1.theme} e ${planet2.theme} que pede consciência para integrar esses potenciais.`,
        quality: aspect.quality,
        keywords: `${planet1.key},${planet2.key},${aspect.type}`,
      });
    }
  }
}

async function seed() {
  try {
    console.log('🌙 Iniciando seed de 881 interpretações astrológicas...\n');

    console.log(`📊 Gerando ${planetSignData.length} interpretações Planeta-Signo...`);
    for (const item of planetSignData) {
      await db.query(
        'INSERT INTO planet_sign_interpretations (planet, sign, language, interpretation, keywords) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (planet, sign, language) DO NOTHING',
        [item.planet, item.sign, 'pt-BR', item.interpretation, item.keywords]
      );
    }
    console.log('✅ Planeta-Signo inseridos!\n');

    console.log(`📊 Gerando ${aspectData.length} interpretações de Aspectos...`);
    for (const item of aspectData) {
      await db.query(
        'INSERT INTO aspect_interpretations (planet1, planet2, aspect_type, language, interpretation, quality, keywords) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (planet1, planet2, aspect_type, language) DO NOTHING',
        [item.planet1, item.planet2, item.aspect_type, 'pt-BR', item.interpretation, item.quality, item.keywords]
      );
    }
    console.log('✅ Aspectos inseridos!\n');

    console.log(`📊 Gerando ${houseData.length} interpretações Casas-Signos...`);
    for (const item of houseData) {
      await db.query(
        'INSERT INTO house_sign_interpretations (house_number, sign, language, interpretation, keywords) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (house_number, sign, language) DO NOTHING',
        [item.house_number, item.sign, 'pt-BR', item.interpretation, item.keywords]
      );
    }
    console.log('✅ Casas-Signos inseridos!\n');

    const total = planetSignData.length + aspectData.length + houseData.length;
    console.log(`🎉 SEED COMPLETO! Total: ${total} interpretações`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao fazer seed:', error);
    process.exit(1);
  }
}

seed();
