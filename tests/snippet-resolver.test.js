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
  });
});
