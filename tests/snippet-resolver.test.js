const { resolveSnippets } = require('../src/services/snippet-resolver.service');

const makeSnippet = (overrides) => ({
  type: 'planet_sign',
  key: 'sun_aries',
  title: 'Título',
  text_md: 'Texto base.',
  tags: ['identidade'],
  priority: 10,
  service_scopes: ['natal'],
  ...overrides,
});

describe('snippet resolver', () => {
  it('resolves snippets for valid tokens', () => {
    const snippets = [
      makeSnippet({ key: 'sun_aries', section: 'identidade' }),
      makeSnippet({ key: 'moon_taurus', section: 'emocoes' }),
    ];

    const tokens = [
      { key: 'sun_aries', section: 'identidade' },
      { key: 'moon_taurus', section: 'emocoes' },
    ];

    const result = resolveSnippets(tokens, 'natal', 'v1', snippets);

    expect(result.sections.identidade).toHaveLength(1);
    expect(result.sections.identidade[0].key).toBe('sun_aries');
    expect(result.sections.emocoes).toHaveLength(1);
    expect(result.sections.emocoes[0].key).toBe('moon_taurus');
  });

  it('respects service scopes', () => {
    const snippets = [
      makeSnippet({ key: 'natal_only', scopes: ['natal'] }),
      makeSnippet({ key: 'both', scopes: ['natal', 'solar_return'] }),
    ];

    const tokens = [
      { key: 'natal_only', section: 'general' },
      { key: 'both', section: 'general' },
    ];

    const result = resolveSnippets(tokens, 'solar_return', 'v1', snippets);

    expect(result.sections.general).toHaveLength(1);
    expect(result.sections.general[0].key).toBe('both');
  });
});
