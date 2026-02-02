const { resolveSnippets } = require('../src/services/snippet-resolver.service');

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
