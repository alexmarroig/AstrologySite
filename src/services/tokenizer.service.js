const SERVICE_TYPE_ALIASES = {
  natal: 'natal',
  natal_chart: 'natal',
  synastry: 'synastry',
  solar_return: 'solar_return',
  revolucao_solar: 'solar_return',
  predictions: 'predictions',
  transits: 'predictions',
  progressions: 'progressions'
};

const normalizeTokenValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

const normalizeServiceType = (serviceType) =>
  SERVICE_TYPE_ALIASES[serviceType] || serviceType || 'natal';

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

const addPlanetTokens = (tokens, planetName, sign, houseNumber) => {
  const planetKey = normalizeTokenValue(planetName);
  const signKey = normalizeTokenValue(sign);

  if (planetKey && signKey) {
    tokens.add(`${planetKey}_${signKey}`);
  }
  if (planetKey && houseNumber) {
    tokens.add(`${planetKey}_house_${houseNumber}`);
  }
  if (planetKey && signKey && houseNumber) {
    tokens.add(`${planetKey}_${signKey}_house_${houseNumber}`);
  }
};

const addAspectTokens = (tokens, planet1, aspectType, planet2, houseNumber) => {
  const p1 = normalizeTokenValue(planet1);
  const p2 = normalizeTokenValue(planet2);
  const typeKey = normalizeTokenValue(aspectType);

  if (!p1 || !p2 || !typeKey) {
    return;
  }

  tokens.add(`aspect_${p1}_${typeKey}_${p2}`);
  tokens.add(`aspect_${p2}_${typeKey}_${p1}`);

  if (houseNumber) {
    tokens.add(`${p1}_${typeKey}_${p2}_house_${houseNumber}`);
  }
};

const extractChartData = (result = {}) => {
  const planets = result.planets || result.ephemeris?.planets || result.ephemeris || {};
  const houses = result.houses || {};
  const aspects = result.aspects || [];
  return { planets, houses, aspects };
};

const tokenizeChart = (result = {}, serviceType = 'natal') => {
  const normalizedService = normalizeServiceType(serviceType);
  const tokens = new Set();

  if (normalizedService === 'predictions') {
    const transits = result.current_transits || result.currentTransits || result.transits || [];
    for (const transit of transits) {
      addPlanetTokens(tokens, transit.planet, transit.sign, transit.current_house);
    }
    return Array.from(tokens).sort();
  }

  if (normalizedService === 'synastry') {
    const aspects = result.aspects || result.interAspects || [];
    for (const aspect of aspects) {
      addAspectTokens(tokens, aspect.planet1, aspect.type, aspect.planet2, null);
    }
    return Array.from(tokens).sort();
  }

  const { planets, houses, aspects } = extractChartData(result);
  const cusps = buildHouseCusps(houses);

  for (const [planetName, data] of Object.entries(planets || {})) {
    const houseNumber = data.house || resolveHouse(data.longitude, cusps);
    addPlanetTokens(tokens, planetName, data.sign, houseNumber);
  }

  for (const aspect of aspects || []) {
    addAspectTokens(tokens, aspect.planet1, aspect.type, aspect.planet2, null);
    if (cusps && planets?.[aspect.planet1]) {
      const houseNumber = resolveHouse(planets[aspect.planet1].longitude, cusps);
      addAspectTokens(tokens, aspect.planet1, aspect.type, aspect.planet2, houseNumber);
    }
    if (cusps && planets?.[aspect.planet2]) {
      const houseNumber = resolveHouse(planets[aspect.planet2].longitude, cusps);
      addAspectTokens(tokens, aspect.planet2, aspect.type, aspect.planet1, houseNumber);
    }
  }

  return Array.from(tokens).sort();
};

module.exports = {
  normalizeServiceType,
  tokenizeChart
};
