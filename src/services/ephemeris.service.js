const swisseph = require('swisseph');

const PLANETS = {
  sun: swisseph.SE_SUN,
  moon: swisseph.SE_MOON,
  mercury: swisseph.SE_MERCURY,
  venus: swisseph.SE_VENUS,
  mars: swisseph.SE_MARS,
  jupiter: swisseph.SE_JUPITER,
  saturn: swisseph.SE_SATURN,
  uranus: swisseph.SE_URANUS,
  neptune: swisseph.SE_NEPTUNE,
  pluto: swisseph.SE_PLUTO,
  'north node': swisseph.SE_TRUE_NODE,
};

const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

const ASPECTS = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'opposition', angle: 180, orb: 8 },
  { type: 'square', angle: 90, orb: 6 },
  { type: 'trine', angle: 120, orb: 6 },
  { type: 'sextile', angle: 60, orb: 4 },
  { type: 'quincunx', angle: 150, orb: 3 },
  { type: 'semisextile', angle: 30, orb: 2 },
  { type: 'semisquare', angle: 45, orb: 2 },
  { type: 'sesquiquadrate', angle: 135, orb: 2 },
  { type: 'quintile', angle: 72, orb: 2 },
  { type: 'biquintile', angle: 144, orb: 2 },
];

const toSignPosition = (longitude) => {
  const normalized = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized % 30;
  return {
    sign: SIGNS[signIndex],
    degreeInSign: Math.floor(degreeInSign),
    minuteInSign: Math.floor((degreeInSign % 1) * 60),
  };
};

const normalizeAngle = (angle) => {
  const normalized = Math.abs(((angle + 180) % 360) - 180);
  return normalized;
};

const parseLocation = (birthLocation) => {
  if (!birthLocation) {
    throw new Error('Local de nascimento inválido');
  }
  if (typeof birthLocation === 'object') {
    const { latitude, longitude } = birthLocation;
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      return { latitude, longitude, label: birthLocation.label || 'Local informado' };
    }
  }
  if (typeof birthLocation === 'string' && birthLocation.includes(',')) {
    const [latRaw, lonRaw] = birthLocation.split(',');
    const latitude = Number(latRaw.trim());
    const longitude = Number(lonRaw.trim());
    if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
      return { latitude, longitude, label: birthLocation };
    }
  }
  throw new Error('birthLocation deve conter latitude e longitude.');
};

const calcJulianDay = (date, time) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return swisseph.swe_julday(year, month, day, hour + minute / 60, swisseph.SE_GREG_CAL);
};

const calcPlanet = (jd, planetId) =>
  new Promise((resolve, reject) => {
    swisseph.swe_calc_ut(jd, planetId, swisseph.SEFLG_SWIEPH, (result) => {
      if (result.error) {
        reject(new Error(result.error));
        return;
      }
      resolve(result);
    });
  });

const calcHouses = (jd, latitude, longitude) =>
  new Promise((resolve, reject) => {
    swisseph.swe_houses(jd, latitude, longitude, 'P', (result) => {
      if (result.error) {
        reject(new Error(result.error));
        return;
      }
      resolve(result);
    });
  });

const buildAspects = (planetPositions) => {
  const aspects = [];
  const planetEntries = Object.entries(planetPositions);
  for (let i = 0; i < planetEntries.length; i += 1) {
    for (let j = i + 1; j < planetEntries.length; j += 1) {
      const [planet1, data1] = planetEntries[i];
      const [planet2, data2] = planetEntries[j];
      const diff = normalizeAngle(data1.longitude - data2.longitude);
      for (const aspect of ASPECTS) {
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= aspect.orb) {
          aspects.push({
            planet1,
            planet2,
            type: aspect.type,
            orb: Number(orb.toFixed(2)),
          });
        }
      }
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb);
};

class EphemerisService {
  async calculateNatalChart(birthDate, birthTime, birthLocation) {
    const location = parseLocation(birthLocation);
    const jd = calcJulianDay(birthDate, birthTime);

    const planets = {};
    for (const [planetName, planetId] of Object.entries(PLANETS)) {
      const data = await calcPlanet(jd, planetId);
      const longitude = data.longitude;
      const signPosition = toSignPosition(longitude);
      planets[planetName] = {
        longitude,
        sign: signPosition.sign,
        degreeInSign: signPosition.degreeInSign,
        retrograde: data.speed < 0,
      };
    }

    const houseData = await calcHouses(jd, location.latitude, location.longitude);
    const houses = {};
    if (houseData.cusps) {
      for (let i = 1; i <= 12; i += 1) {
        const position = toSignPosition(houseData.cusps[i]);
        houses[`house${i}`] = {
          longitude: houseData.cusps[i],
          sign: position.sign,
          degreeInSign: position.degreeInSign,
        };
      }
    }

    const aspects = buildAspects(planets);

    return {
      birthDate,
      birthTime,
      location: location.label,
      planets,
      houses,
      aspects,
    };
  }
}

module.exports = new EphemerisService();
