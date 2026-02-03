const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
jest.mock('../src/content/contentStore', () => ({
  getMeta: jest.fn(),
  getReportConfig: jest.fn(),
  getSnippetsByKeys: jest.fn()
}));

const contentStore = require('../src/content/contentStore');
const { resolveSnippets } = require('../src/engine/resolver');

const originalGetMeta = contentStore.getMeta;
const originalGetReportConfig = contentStore.getReportConfig;
const originalGetSnippetsByKeys = contentStore.getSnippetsByKeys;

beforeEach(() => {
  contentStore.getMeta = () => ({
    content_version: 'v1',
    defaults: { max_snippets_per_section: 6, max_total_snippets: 42 }
  });
  contentStore.getReportConfig = () => ({
    sections_order: {
      natal: ['summary', 'core_identity']
    },
    dedupe_rules: [
      {
        prefer_type: 'planet_sign_house',
        suppress_types: ['planet_sign', 'planet_house']
      }
    ]
  });
});

test('resolver dedupe remove planet_sign quando planet_sign_house existe', () => {
  contentStore.getSnippetsByKeys = () => [
    {
      type: 'planet_sign_house',
      key: 'sun_aries_house_1',
      title: 'Sol em Áries na Casa 1',
      text_md: 'Texto',
      priority: 90,
      service_scopes: ['natal'],
      sections: ['core_identity']
    },
    {
      type: 'planet_sign',
      key: 'sun_aries',
      title: 'Sol em Áries',
      text_md: 'Texto',
      priority: 80,
      service_scopes: ['natal'],
      sections: ['core_identity']
    }
  ];

  const result = resolveSnippets({
    tokens: ['sun_aries_house_1', 'sun_aries'],
    service: 'natal',
    contentVersion: 'v1'
  });

  assert.ok(result.selected_keys.includes('sun_aries_house_1'));
  assert.ok(!result.selected_keys.includes('sun_aries'));
});

test('resolver limites de summary respeitados', () => {
  contentStore.getSnippetsByKeys = () => [
    {
      type: 'theme',
      key: 'summary_1',
      title: 'Resumo 1',
      text_md: 'Texto',
      priority: 90,
      service_scopes: ['natal'],
      sections: ['summary']
    },
    {
      type: 'theme',
      key: 'summary_2',
      title: 'Resumo 2',
      text_md: 'Texto',
      priority: 80,
      service_scopes: ['natal'],
      sections: ['summary']
    },
    {
      type: 'theme',
      key: 'summary_3',
      title: 'Resumo 3',
      text_md: 'Texto',
      priority: 70,
      service_scopes: ['natal'],
      sections: ['summary']
    }
  ];

  const result = resolveSnippets({
    tokens: ['summary_1', 'summary_2', 'summary_3'],
    service: 'natal',
    contentVersion: 'v1'
  });

  assert.equal(result.sections.summary.length, 2);
});

test('resolver output determinístico', () => {
  contentStore.getSnippetsByKeys = () => [
    {
      type: 'theme',
      key: 'a_key',
      title: 'A',
      text_md: 'Texto',
      priority: 80,
      service_scopes: ['natal'],
      sections: ['core_identity']
    },
    {
      type: 'theme',
      key: 'b_key',
      title: 'B',
      text_md: 'Texto',
      priority: 80,
      service_scopes: ['natal'],
      sections: ['core_identity']
    }
  ];

  const result1 = resolveSnippets({
    tokens: ['b_key', 'a_key'],
    service: 'natal',
    contentVersion: 'v1'
  });
  const result2 = resolveSnippets({
    tokens: ['b_key', 'a_key'],
    service: 'natal',
    contentVersion: 'v1'
  });

  assert.deepEqual(result1.selected_keys, result2.selected_keys);
});

process.on('exit', () => {
  contentStore.getMeta = originalGetMeta;
  contentStore.getReportConfig = originalGetReportConfig;
  contentStore.getSnippetsByKeys = originalGetSnippetsByKeys;
describe('resolveSnippets', () => {
  beforeEach(() => {
    contentStore.getMeta.mockReturnValue({
      content_version: 'v1',
      defaults: { max_snippets_per_section: 6, max_total_snippets: 42 }
    });
    contentStore.getReportConfig.mockReturnValue({
      sections_order: {
        natal: ['summary', 'core_identity']
      },
      dedupe_rules: [
        {
          prefer_type: 'planet_sign_house',
          suppress_types: ['planet_sign', 'planet_house']
        }
      ]
    });
  });

  test('dedupe remove planet_sign quando planet_sign_house existe', () => {
    contentStore.getSnippetsByKeys.mockReturnValue([
      {
        type: 'planet_sign_house',
        key: 'sun_aries_house_1',
        title: 'Sol em Áries na Casa 1',
        text_md: 'Texto',
        priority: 90,
        service_scopes: ['natal'],
        sections: ['core_identity']
      },
      {
        type: 'planet_sign',
        key: 'sun_aries',
        title: 'Sol em Áries',
        text_md: 'Texto',
        priority: 80,
        service_scopes: ['natal'],
        sections: ['core_identity']
      }
    ]);

    const result = resolveSnippets({
      tokens: ['sun_aries_house_1', 'sun_aries'],
      service: 'natal',
      contentVersion: 'v1'
    });

    expect(result.selected_keys).toContain('sun_aries_house_1');
    expect(result.selected_keys).not.toContain('sun_aries');
  });

  test('limites de summary respeitados', () => {
    contentStore.getSnippetsByKeys.mockReturnValue([
      {
        type: 'theme',
        key: 'summary_1',
        title: 'Resumo 1',
        text_md: 'Texto',
        priority: 90,
        service_scopes: ['natal'],
        sections: ['summary']
      },
      {
        type: 'theme',
        key: 'summary_2',
        title: 'Resumo 2',
        text_md: 'Texto',
        priority: 80,
        service_scopes: ['natal'],
        sections: ['summary']
      },
      {
        type: 'theme',
        key: 'summary_3',
        title: 'Resumo 3',
        text_md: 'Texto',
        priority: 70,
        service_scopes: ['natal'],
        sections: ['summary']
      }
    ]);

    const result = resolveSnippets({
      tokens: ['summary_1', 'summary_2', 'summary_3'],
      service: 'natal',
      contentVersion: 'v1'
    });

    expect(result.sections.summary.length).toBe(2);
  });

  test('output determinístico', () => {
    contentStore.getSnippetsByKeys.mockReturnValue([
      {
        type: 'theme',
        key: 'a_key',
        title: 'A',
        text_md: 'Texto',
        priority: 80,
        service_scopes: ['natal'],
        sections: ['core_identity']
      },
      {
        type: 'theme',
        key: 'b_key',
        title: 'B',
        text_md: 'Texto',
        priority: 80,
        service_scopes: ['natal'],
        sections: ['core_identity']
      }
    ]);

    const result1 = resolveSnippets({
      tokens: ['b_key', 'a_key'],
      service: 'natal',
      contentVersion: 'v1'
    });
    const result2 = resolveSnippets({
      tokens: ['b_key', 'a_key'],
      service: 'natal',
      contentVersion: 'v1'
    });

    expect(result1.selected_keys).toEqual(result2.selected_keys);
  });
});
