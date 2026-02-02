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
  it('dedupe snippets for planet/house and aspect/house combinations', () => {
    const snippets = [
      makeSnippet({
        type: 'planet_sign_house',
        key: 'sun_aries_house_1',
        priority: 90,
      }),
      makeSnippet({ type: 'planet_sign', key: 'sun_aries' }),
      makeSnippet({ type: 'planet_house', key: 'sun_house_1' }),
      makeSnippet({ type: 'planet_sign', key: 'moon_aries' }),
      makeSnippet({
        type: 'aspect_house',
        key: 'moon_trine_venus_house_2',
        tags: ['relacoes'],
        priority: 80,
      }),
      makeSnippet({ type: 'aspect', key: 'aspect_moon_trine_venus', tags: ['relacoes'] }),
    ];

    const tokens = snippets.map((snippet) => snippet.key);
    const result = resolveSnippets(tokens, 'natal', 'v1', snippets);
    const resolvedKeys = Object.values(result.sections).flat().map((snippet) => snippet.key);

    expect(resolvedKeys).toContain('sun_aries_house_1');
    expect(resolvedKeys).toContain('moon_aries');
    expect(resolvedKeys).toContain('moon_trine_venus_house_2');
    expect(resolvedKeys).not.toContain('sun_aries');
    expect(resolvedKeys).not.toContain('sun_house_1');
    expect(resolvedKeys).not.toContain('aspect_moon_trine_venus');
  });

  it('respects service scopes and section limits', () => {
    const identidadeSnippets = Array.from({ length: 8 }, (_, index) =>
      makeSnippet({
        key: `identidade_${index}`,
        type: 'planet_sign',
        priority: 100 - index,
        service_scopes: ['predictions'],
      })
    );

    const snippets = [
      ...identidadeSnippets,
      makeSnippet({
        key: 'natal_only',
        type: 'planet_sign',
        service_scopes: ['natal'],
        priority: 200,
      }),
    ];

    const tokens = snippets.map((snippet) => snippet.key);
    const result = resolveSnippets(tokens, 'predictions', 'v1', snippets);

    expect(result.sections.identidade).toHaveLength(6);
    const resolvedKeys = result.sections.identidade.map((snippet) => snippet.key);
    expect(resolvedKeys).toContain('identidade_0');
    expect(resolvedKeys).toContain('identidade_5');
    expect(resolvedKeys).not.toContain('identidade_6');
    expect(resolvedKeys).not.toContain('natal_only');
  });

  it('fails fast on invalid snippets', () => {
    expect(() =>
      resolveSnippets(['invalid_key'], 'natal', 'v1', [
        {
          type: 'invalid_type',
          key: 'invalid_key',
          title: 'Inválido',
          text_md: 'Texto',
        },
      ])
    ).toThrow(/unsupported type/);
const collectKeys = (sections) =>
  Object.values(sections)
    .flat()
    .map((snippet) => snippet.key);

const makeSnippet = (overrides) => ({
  type: 'planet_sign',
  key: 'sun_aries',
  title: 'Title',
  text_md: 'Body',
  priority: 0,
  service_scopes: ['natal'],
  tags: [],
  ...overrides
});

describe('snippet resolver', () => {
  test('dedupes planet_sign and planet_house when planet_sign_house exists', () => {
    const snippets = [
      makeSnippet({ type: 'planet_sign', key: 'sun_aries' }),
      makeSnippet({ type: 'planet_house', key: 'sun_house_1' }),
      makeSnippet({
        type: 'planet_sign_house',
        key: 'sun_aries_house_1',
        priority: 10
      })
    ];

    const tokens = snippets.map((snippet) => snippet.key);
    const { sections } = resolveSnippets(tokens, 'natal', 'v1', snippets);
    const keys = collectKeys(sections);

    expect(keys).toContain('sun_aries_house_1');
    expect(keys).not.toContain('sun_aries');
    expect(keys).not.toContain('sun_house_1');
  });

  test('dedupes aspect snippets when aspect_house exists', () => {
    const snippets = [
      makeSnippet({ type: 'aspect', key: 'aspect_mars_trine_saturn' }),
      makeSnippet({
        type: 'aspect_house',
        key: 'mars_trine_saturn_house_3',
        priority: 10
      })
    ];

    const tokens = snippets.map((snippet) => snippet.key);
    const { sections } = resolveSnippets(tokens, 'natal', 'v1', snippets);
    const keys = collectKeys(sections);

    expect(keys).toContain('mars_trine_saturn_house_3');
    expect(keys).not.toContain('aspect_mars_trine_saturn');
  });

  test('honors section limits and prioritization', () => {
    const snippets = [];
    const tokens = [];

    for (let i = 0; i < 7; i += 1) {
      snippets.push(
        makeSnippet({
          key: `id_${i}`,
          priority: i,
          tags: ['identidade']
        })
      );
      tokens.push(`id_${i}`);
    }

    for (let i = 0; i < 4; i += 1) {
      snippets.push(
        makeSnippet({
          key: `resumo_${i}`,
          priority: 20 + i,
          tags: []
        })
      );
      tokens.push(`resumo_${i}`);
    }

    const { sections } = resolveSnippets(tokens, 'natal', 'v1', snippets);

    expect(sections.identidade).toHaveLength(6);
    expect(sections.resumo).toHaveLength(3);

    const identidadeKeys = sections.identidade.map((snippet) => snippet.key);
    expect(identidadeKeys).toEqual([
      'id_6',
      'id_5',
      'id_4',
      'id_3',
      'id_2',
      'id_1'
    ]);
  });

  test('respects total limit across sections', () => {
    const snippets = [];
    const tokens = [];

    for (let i = 0; i < 5; i += 1) {
      snippets.push(
        makeSnippet({
          key: `id_${i}`,
          priority: i,
          tags: ['identidade']
        })
      );
      tokens.push(`id_${i}`);
    }

    for (let i = 0; i < 5; i += 1) {
      snippets.push(
        makeSnippet({
          key: `rel_${i}`,
          priority: i,
          tags: ['relacoes']
        })
      );
      tokens.push(`rel_${i}`);
    }

    const { sections } = resolveSnippets(tokens, 'natal', 'v1', snippets, { total_limit: 4 });
    const total = Object.values(sections).reduce((sum, list) => sum + list.length, 0);

    expect(total).toBe(4);
  });

  test('returns deterministic output ordering', () => {
    const snippets = [
      makeSnippet({ key: 'b_key', priority: 1, tags: ['identidade'] }),
      makeSnippet({ key: 'a_key', priority: 1, tags: ['identidade'] }),
      makeSnippet({ key: 'c_key', priority: 2, tags: ['identidade'] })
    ];

    const tokens = snippets.map((snippet) => snippet.key);
    const first = resolveSnippets(tokens, 'natal', 'v1', snippets).sections.identidade.map(
      (snippet) => snippet.key
    );
    const second = resolveSnippets(tokens, 'natal', 'v1', [...snippets].reverse()).sections.identidade.map(
      (snippet) => snippet.key
    );

    expect(first).toEqual(['c_key', 'a_key', 'b_key']);
    expect(second).toEqual(first);
  });
});
