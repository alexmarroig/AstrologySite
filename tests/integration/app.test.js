const request = require('supertest');

process.env.JWT_SECRET = 'test-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

jest.mock('../../src/services/ephemeris.service', () => ({
  calculateNatalChart: jest.fn(async (birthDate, birthTime, birthLocation) => ({
    birthDate,
    birthTime,
    location: typeof birthLocation === 'string' ? birthLocation : birthLocation.label,
    planets: {
      sun: { sign: 'Capricorn', degreeInSign: 25, longitude: 295, retrograde: false },
      moon: { sign: 'Virgo', degreeInSign: 12, longitude: 162, retrograde: false },
    },
    houses: {
      house1: { sign: 'Leo', degreeInSign: 15, longitude: 135 },
    },
    aspects: [
      { planet1: 'sun', planet2: 'moon', type: 'sextile', orb: 2.1 },
    ],
  })),
}));

jest.mock('../../src/services/interpretation.service', () => ({
  getChartInterpretations: jest.fn(async () => ({
    planets: {
      sun: { sign: 'Capricorn', degree: 25, retrograde: false, interpretation: 'Texto' },
    },
    houses: {
      house1: { sign: 'Leo', degree: 15, interpretation: 'Texto' },
    },
    aspects: [
      { planet1: 'sun', planet2: 'moon', type: 'sextile', orb: 2.1, interpretation: 'Texto' },
    ],
  })),
  getStats: jest.fn(async () => ({
    planetSignInterpretations: 1,
    aspectInterpretations: 1,
    houseSignInterpretations: 1,
    total: 3,
  })),
}));

jest.mock('../../src/services/llm-optimized.service', () => ({
  synthesizeNatalChart: jest.fn(async () => 'Resumo sintetizado.'),
}));

const app = require('../../src/app');

describe('API integration', () => {
  it('responde health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('registra, loga e retorna /me', async () => {
    const register = await request(app).post('/api/auth/register').send({
      email: 'teste@astrolumen.com',
      password: 'Senha123',
      full_name: 'Astro User',
    });
    expect(register.status).toBe(201);
    expect(register.body.access_token).toBeTruthy();

    const login = await request(app).post('/api/auth/login').send({
      email: 'teste@astrolumen.com',
      password: 'Senha123',
    });
    expect(login.status).toBe(200);
    expect(login.body.access_token).toBeTruthy();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.access_token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('teste@astrolumen.com');
  });

  it('retorna preview de mapa natal', async () => {
    const register = await request(app).post('/api/auth/register').send({
      email: 'preview@astrolumen.com',
      password: 'Senha123',
      full_name: 'Preview User',
    });
    const token = register.body.access_token;

    const response = await request(app)
      .post('/api/analysis/natal-chart')
      .set('Authorization', `Bearer ${token}`)
      .send({
        birth_date: '1995-01-15',
        birth_time: '14:30',
        birth_location: '0,0',
      });

    expect(response.status).toBe(200);
    expect(response.body.ephemeris).toBeTruthy();
    expect(response.body.pricing).toBeTruthy();
  });
});
