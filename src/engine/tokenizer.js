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

module.exports = {
  tokenizeNatal,
  tokenizeSolarReturn,
  tokenizeSynastry,
  tokenizePredictions,
  tokenizeProgressions
};
