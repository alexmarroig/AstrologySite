const loadContentStore = (content) => {
  jest.resetModules();
  jest.doMock('fs', () => ({
    readFileSync: jest.fn(() => JSON.stringify(content))
  }));

  return require('../src/data/content/content-store');
};

const makeSnippet = (overrides = {}) => ({
  type: 'planet_sign',
  key: 'sun_aries',
  title: 'Title',
  text_md: 'Body',
  priority: 0,
  service_scopes: ['natal'],
  sections: ['resumo'],
  ...overrides
});

const makeContent = (snippets) => ({
  services: [],
  interpretation_library: {
    snippets
  }
});

describe('content-store validation', () => {
  test('rejeita type inválido', () => {
    const content = makeContent([makeSnippet({ type: 'unknown_type' })]);
    const { getContent } = loadContentStore(content);

    expect(() => getContent()).toThrow(/type inválido/);
  });

  test('rejeita key duplicada', () => {
    const content = makeContent([
      makeSnippet({ key: 'dup_key' }),
      makeSnippet({ key: 'dup_key', type: 'planet_house' })
    ]);
    const { getContent } = loadContentStore(content);

    expect(() => getContent()).toThrow(/key duplicado/);
  });

  test('rejeita section não-canônica', () => {
    const content = makeContent([
      makeSnippet({ sections: ['resumo', 'invalida'] })
    ]);
    const { getContent } = loadContentStore(content);

    expect(() => getContent()).toThrow(/seção inválida/);
  });
});
