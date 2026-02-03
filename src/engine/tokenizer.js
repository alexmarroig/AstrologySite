const normalize = (value) => String(value || '').toLowerCase();

const normalizeSign = (sign) => normalize(sign);
const normalizePlanet = (planet) => normalize(planet);
const normalizeAspect = (aspect) => normalize(aspect);

const buildHouseToken = (house) => `house_${Number(house)}`;

const tokenizeNatal = (chartResult = {}) => {
  const tokens = new Set();
  const planets = chartResult.planets || {};

  Object.entries(planets).forEach(([planet, data]) => {
    const planetKey = normalizePlanet(planet);
    const sign = normalizeSign(data.sign);
    if (planetKey && sign) {
      tokens.add(`${planetKey}_${sign}`);
    }
    if (data.house) {
      tokens.add(`${planetKey}_${buildHouseToken(data.house)}`);
    }
    if (planetKey && sign && data.house) {
      tokens.add(`${planetKey}_${sign}_${buildHouseToken(data.house)}`);
    }
  });

  const aspects = chartResult.aspects || [];
  aspects.forEach((aspect) => {
    const p1 = normalizePlanet(aspect.planet1);
    const p2 = normalizePlanet(aspect.planet2);
    const type = normalizeAspect(aspect.type);
    if (p1 && p2 && type) {
      tokens.add(`${p1}_${type}_${p2}`);
      if (aspect.house) {
        tokens.add(`${p1}_${type}_${p2}_${buildHouseToken(aspect.house)}`);
      }
    }
  });

  const points = chartResult.points || {};
  if (points.asc?.sign) {
    tokens.add(`asc_${normalizeSign(points.asc.sign)}`);
  }
  if (points.mc?.sign) {
    tokens.add(`mc_${normalizeSign(points.mc.sign)}`);
  }

  return Array.from(tokens);
};

const tokenizeSolarReturn = (srResult = {}) => {
  const tokens = new Set();
  const planets = srResult.planets || {};

  Object.entries(planets).forEach(([planet, data]) => {
    const planetKey = normalizePlanet(planet);
    const sign = normalizeSign(data.sign);
    if (planetKey && sign) {
      tokens.add(`sr_${planetKey}_${sign}`);
    }
    if (data.house) {
      tokens.add(`sr_${planetKey}_${buildHouseToken(data.house)}`);
    }
  });

  const aspects = srResult.aspects || [];
  aspects.forEach((aspect) => {
    const p1 = normalizePlanet(aspect.planet1);
    const p2 = normalizePlanet(aspect.planet2);
    const type = normalizeAspect(aspect.type);
    if (p1 && p2 && type) {
      tokens.add(`sr_${p1}_${type}_sr_${p2}`);
    }
  });

  return Array.from(tokens);
};

const tokenizeSynastry = (synResult = {}) => {
  const tokens = new Set();
  const aspects = synResult.aspects || [];

  aspects.forEach((aspect) => {
    const p1 = normalizePlanet(aspect.planet1);
    const p2 = normalizePlanet(aspect.planet2);
    const type = normalizeAspect(aspect.type || aspect.aspect);
    if (p1 && p2 && type) {
      tokens.add(`p1_${p1}_${type}_p2_${p2}`);
    }
  });

  const overlays = synResult.overlays || [];
  overlays.forEach((overlay) => {
    if (overlay.planet && overlay.house) {
      tokens.add(`p1_${normalizePlanet(overlay.planet)}_in_p2_${buildHouseToken(overlay.house)}`);
    }
  });

  return Array.from(tokens);
const PLANET_ENUM = new Map([
  ['sun', 'sun'],
  ['moon', 'moon'],
  ['mercury', 'mercury'],
  ['venus', 'venus'],
  ['mars', 'mars'],
  ['jupiter', 'jupiter'],
  ['saturn', 'saturn'],
  ['uranus', 'uranus'],
  ['neptune', 'neptune'],
  ['pluto', 'pluto'],
  ['north_node', 'north_node'],
  ['northnode', 'north_node'],
  ['north node', 'north_node'],
  ['true node', 'north_node'],
  ['node', 'north_node']
]);

const SIGN_ENUM = new Map([
  ['aries', 'aries'],
  ['taurus', 'taurus'],
  ['touro', 'taurus'],
  ['gemini', 'gemini'],
  ['gemeos', 'gemini'],
  ['cancer', 'cancer'],
  ['leao', 'leo'],
  ['leo', 'leo'],
  ['virgo', 'virgo'],
  ['virgem', 'virgo'],
  ['libra', 'libra'],
  ['scorpio', 'scorpio'],
  ['escorpiao', 'scorpio'],
  ['sagittarius', 'sagittarius'],
  ['sagitario', 'sagittarius'],
  ['capricorn', 'capricorn'],
  ['capricornio', 'capricorn'],
  ['aquarius', 'aquarius'],
  ['aquario', 'aquarius'],
  ['pisces', 'pisces'],
  ['peixes', 'pisces']
]);

const ASPECT_ENUM = new Map([
  ['conjunction', 'conjunct'],
  ['conjunct', 'conjunct'],
  ['opposition', 'opposition'],
  ['square', 'square'],
  ['trine', 'trine'],
  ['sextile', 'sextile'],
  ['quincunx', 'quincunx'],
  ['semisextile', 'semisextile'],
  ['semisquare', 'semisquare'],
  ['sesquiquadrate', 'sesquiquadrate'],
  ['quintile', 'quintile'],
  ['biquintile', 'biquintile']
]);

const ANGLE_ENUM = new Map([
  ['asc', 'asc'],
  ['ascendant', 'asc'],
  ['rising', 'asc'],
  ['mc', 'mc'],
  ['midheaven', 'mc'],
  ['ic', 'ic'],
  ['dc', 'dc'],
  ['desc', 'dc'],
  ['descendant', 'dc']
]);

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

const mapEnumValue = (value, map) => {
  const normalized = normalizeKey(value);
  if (!normalized) {
    return null;
  }
  return map.get(normalized) || null;
};

const normalizePlanet = (value) => mapEnumValue(value, PLANET_ENUM);
const normalizeSign = (value) => mapEnumValue(value, SIGN_ENUM);
const normalizeAspect = (value) => mapEnumValue(value, ASPECT_ENUM);
const normalizeAngle = (value) => mapEnumValue(value, ANGLE_ENUM);

const normalizeHouseNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const rounded = Math.round(value);
    return rounded >= 1 && rounded <= 12 ? rounded : null;
  }
  const normalized = normalizeKey(value);
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith('house')) {
    const numberValue = Number(normalized.replace('house', ''));
    return numberValue >= 1 && numberValue <= 12 ? numberValue : null;
  }
  const numberValue = Number(normalized);
  return numberValue >= 1 && numberValue <= 12 ? numberValue : null;
};

const buildHouseCusps = (houses = {}) => {
  const cusps = [];
  for (let i = 1; i <= 12; i += 1) {
    const house = houses[`house${i}`];
    if (!house || typeof house.longitude !== 'number') {
      return null;
    }
    cusps.push(house.longitude);
  }
  return cusps;
};

const resolveHouse = (longitude, cusps) => {
  if (!Array.isArray(cusps) || typeof longitude !== 'number') {
    return null;
  }

  const normalized = ((longitude % 360) + 360) % 360;
  for (let idx = 0; idx < 12; idx += 1) {
    const start = ((cusps[idx] % 360) + 360) % 360;
    const end = ((cusps[(idx + 1) % 12] % 360) + 360) % 360;
    if (start < end && normalized >= start && normalized < end) {
      return idx + 1;
    }
    if (start > end && (normalized >= start || normalized < end)) {
      return idx + 1;
    }
  }
  return 1;
};

const addPlanetTokens = (tokens, planetName, signName, houseNumber) => {
  const planet = normalizePlanet(planetName);
  const sign = normalizeSign(signName);
  const houseNumberNormalized = normalizeHouseNumber(houseNumber);

  if (planet && sign) {
    tokens.add(`${planet}_${sign}`);
  }
  if (planet && houseNumberNormalized) {
    tokens.add(`${planet}_house_${houseNumberNormalized}`);
  }
  if (planet && sign && houseNumberNormalized) {
    tokens.add(`${planet}_${sign}_house_${houseNumberNormalized}`);
  }
};

const addAspectTokens = (tokens, planet1, aspectType, planet2, houseNumber) => {
  const p1 = normalizePlanet(planet1);
  const p2 = normalizePlanet(planet2);
  const aspect = normalizeAspect(aspectType);
  const houseNumberNormalized = normalizeHouseNumber(houseNumber);

  if (!p1 || !p2 || !aspect) {
    return;
  }

  tokens.add(`${p1}_${aspect}_${p2}`);
  tokens.add(`${p2}_${aspect}_${p1}`);

  if (houseNumberNormalized) {
    tokens.add(`${p1}_${aspect}_${p2}_house_${houseNumberNormalized}`);
    tokens.add(`${p2}_${aspect}_${p1}_house_${houseNumberNormalized}`);
  }
};

const addAngleTokens = (tokens, angleName, signName) => {
  const angle = normalizeAngle(angleName);
  const sign = normalizeSign(signName);
  if (!angle || !sign) {
    return;
  }
  tokens.add(`${angle}_${sign}`);
};

const extractChartData = (result = {}) => {
  const chart = result.chart || result.natal_chart || result.solar_return_chart || result;
  const planets = chart.planets || chart.ephemeris?.planets || chart.ephemeris || chart;
  const houses = chart.houses || {};
  const aspects = chart.aspects || [];
  return { planets, houses, aspects };
};

const tokenizeBaseChart = (chartResult = {}) => {
  const tokens = new Set();
  const { planets, houses, aspects } = extractChartData(chartResult);
  const cusps = buildHouseCusps(houses);

  for (const [planetName, data] of Object.entries(planets || {})) {
    const houseNumber = normalizeHouseNumber(data.house) || resolveHouse(data.longitude, cusps);
    addPlanetTokens(tokens, planetName, data.sign, houseNumber);
  }

  for (const aspect of aspects || []) {
    addAspectTokens(tokens, aspect.planet1, aspect.type || aspect.aspect, aspect.planet2, null);
    if (cusps && planets?.[aspect.planet1]) {
      const houseNumber = resolveHouse(planets[aspect.planet1].longitude, cusps);
      addAspectTokens(tokens, aspect.planet1, aspect.type || aspect.aspect, aspect.planet2, houseNumber);
    }
    if (cusps && planets?.[aspect.planet2]) {
      const houseNumber = resolveHouse(planets[aspect.planet2].longitude, cusps);
      addAspectTokens(tokens, aspect.planet2, aspect.type || aspect.aspect, aspect.planet1, houseNumber);
    }
  }

  addAngleTokens(tokens, 'asc', houses.house1?.sign);
  addAngleTokens(tokens, 'ic', houses.house4?.sign);
  addAngleTokens(tokens, 'dc', houses.house7?.sign);
  addAngleTokens(tokens, 'mc', houses.house10?.sign);

  return Array.from(tokens).sort();
};

const prefixTokens = (tokens, prefix) =>
  Array.from(new Set(tokens.map((token) => `${prefix}_${token}`))).sort();

const tokenizeNatal = (chartResult = {}) => tokenizeBaseChart(chartResult);

const tokenizeSolarReturn = (srResult = {}) => prefixTokens(tokenizeBaseChart(srResult), 'sr');

const tokenizeSynastry = (synResult = {}) => {
  const tokens = new Set();
  const aspects = synResult.aspects || synResult.interAspects || synResult.keyAspects || [];

  for (const aspect of aspects || []) {
    addAspectTokens(tokens, aspect.planet1, aspect.type || aspect.aspect, aspect.planet2, null);
  }

  return prefixTokens(Array.from(tokens), 'syn');
};

const tokenizePredictions = (transitResult = {}) => {
  const tokens = new Set();
  const transits = transitResult.transits || [];

  transits.forEach((transit) => {
    const planet = normalizePlanet(transit.planet);
    const aspect = normalizeAspect(transit.aspect);
    const target = normalizePlanet(transit.target);
    if (planet && aspect && target) {
      tokens.add(`transit_${planet}_${aspect}_natal_${target}`);
    }
    if (planet && transit.house) {
      tokens.add(`transit_${planet}_${buildHouseToken(transit.house)}`);
    }
    if (transit.window) {
      tokens.add(`transit_window_${transit.window}`);
    }
  });

  return Array.from(tokens);
};

const tokenizeProgressions = (progResult = {}) => {
  const tokens = new Set();
  const planets = progResult.planets || {};

  Object.entries(planets).forEach(([planet, data]) => {
    const planetKey = normalizePlanet(planet);
    const sign = normalizeSign(data.sign);
    if (planetKey && sign) {
      tokens.add(`prog_${planetKey}_${sign}`);
    }
    if (data.house) {
      tokens.add(`prog_${planetKey}_${buildHouseToken(data.house)}`);
    }
  });

  const aspects = progResult.aspects || [];
  aspects.forEach((aspect) => {
    const p1 = normalizePlanet(aspect.planet1);
    const p2 = normalizePlanet(aspect.planet2);
    const type = normalizeAspect(aspect.type);
    if (p1 && p2 && type) {
      tokens.add(`prog_${p1}_${type}_natal_${p2}`);
    }
  });

  return Array.from(tokens);
};

  const transits =
    transitResult.current_transits ||
    transitResult.currentTransits ||
    transitResult.transits ||
    transitResult.current_transit ||
    [];

  for (const transit of transits || []) {
    addPlanetTokens(tokens, transit.planet, transit.sign, transit.current_house || transit.house);
  }

  const aspects = transitResult.aspects || transitResult.transitAspects || [];
  for (const aspect of aspects || []) {
    addAspectTokens(tokens, aspect.planet1, aspect.type || aspect.aspect, aspect.planet2, aspect.house);
  }

  return prefixTokens(Array.from(tokens), 'transit');
};

const tokenizeProgressions = (progResult = {}) =>
  prefixTokens(tokenizeBaseChart(progResult), 'prog');

module.exports = {
  tokenizeNatal,
  tokenizeSolarReturn,
  tokenizeSynastry,
  tokenizePredictions,
  tokenizeProgressions
};
