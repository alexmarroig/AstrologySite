const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  tokenizeProgressions,
  tokenizePredictions
} = require('../src/engine/tokenizer');

test('tokenizeProgressions gera tokens reais', () => {
  const tokens = tokenizeProgressions({
    planets: {
      moon: { sign: 'Cancer', house: 4 },
      sun: { sign: 'Leo', house: 10 }
    },
    aspects: [
      { planet1: 'moon', planet2: 'venus', type: 'trine' }
    ]
  });

  assert.ok(tokens.length > 0);
  assert.ok(tokens.includes('prog_moon_cancer'));
  assert.ok(tokens.includes('prog_sun_house_10'));
  assert.ok(tokens.some((token) => /^prog_moon_trine_natal_venus$/.test(token)));
});

test('tokenizePredictions gera transit_window e aspectos', () => {
  const tokens = tokenizePredictions({
    transits: [
      { planet: 'saturn', target: 'sun', aspect: 'square', house: 2 }
    ],
    window: '2026-02'
  });

  assert.ok(tokens.some((token) => token === 'transit_saturn_square_natal_sun'));
  assert.ok(tokens.some((token) => token === 'transit_saturn_house_2'));
  assert.ok(tokens.some((token) => token === 'transit_window_2026-02'));
});
