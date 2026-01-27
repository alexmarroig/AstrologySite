const db = require('../db');

class InterpretationService {
  async getPlanetSignInterpretation(planet, sign) {
    const result = await db.query(
      'SELECT interpretation, keywords FROM planet_sign_interpretations WHERE LOWER(planet) = LOWER($1) AND LOWER(sign) = LOWER($2)',
      [planet, sign]
    );
    return result.rows[0] || null;
  }

  async getAspectInterpretation(planet1, planet2, aspectType) {
    const result = await db.query(
      'SELECT interpretation, quality FROM aspect_interpretations WHERE LOWER(planet1) = LOWER($1) AND LOWER(planet2) = LOWER($2) AND LOWER(aspect_type) = LOWER($3)',
      [planet1, planet2, aspectType]
    );
    return result.rows[0] || null;
  }

  async getHouseInterpretation(houseNumber, sign) {
    const result = await db.query(
      'SELECT interpretation, keywords FROM house_sign_interpretations WHERE house_number = $1 AND LOWER(sign) = LOWER($2)',
      [houseNumber, sign]
    );
    return result.rows[0] || null;
  }

  async getChartInterpretations(chartData) {
    const interpretations = {
      planets: {},
      houses: {},
      aspects: [],
    };

    for (const [planetName, planetData] of Object.entries(chartData.planets)) {
      const interp = await this.getPlanetSignInterpretation(
        planetName,
        planetData.sign
      );
      if (interp) {
        interpretations.planets[planetName] = {
          sign: planetData.sign,
          degree: planetData.degreeInSign,
          retrograde: planetData.retrograde,
          interpretation: interp.interpretation,
          keywords: interp.keywords,
        };
      }
    }

    for (const [houseName, houseData] of Object.entries(chartData.houses)) {
      const houseNum = parseInt(houseName.replace('house', ''), 10);
      const interp = await this.getHouseInterpretation(houseNum, houseData.sign);
      if (interp) {
        interpretations.houses[houseName] = {
          sign: houseData.sign,
          degree: houseData.degreeInSign,
          interpretation: interp.interpretation,
          keywords: interp.keywords,
        };
      }
    }

    for (const aspect of chartData.aspects.slice(0, 10)) {
      const interp = await this.getAspectInterpretation(
        aspect.planet1,
        aspect.planet2,
        aspect.type
      );
      if (interp) {
        interpretations.aspects.push({
          planet1: aspect.planet1,
          planet2: aspect.planet2,
          type: aspect.type,
          orb: aspect.orb,
          interpretation: interp.interpretation,
          quality: interp.quality,
        });
      }
    }

    return interpretations;
  }

  async getStats() {
    const planetCount = await db.query(
      'SELECT COUNT(*) AS count FROM planet_sign_interpretations'
    );
    const aspectCount = await db.query(
      'SELECT COUNT(*) AS count FROM aspect_interpretations'
    );
    const houseCount = await db.query(
      'SELECT COUNT(*) AS count FROM house_sign_interpretations'
    );

    const planetTotal = parseInt(planetCount.rows[0].count, 10);
    const aspectTotal = parseInt(aspectCount.rows[0].count, 10);
    const houseTotal = parseInt(houseCount.rows[0].count, 10);

    return {
      planetSignInterpretations: planetTotal,
      aspectInterpretations: aspectTotal,
      houseSignInterpretations: houseTotal,
      total: planetTotal + aspectTotal + houseTotal,
    };
  }
}

module.exports = new InterpretationService();
