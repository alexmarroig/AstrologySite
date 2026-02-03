const fs = require('fs');
const path = require('path');
const {
  VALID_SNIPPET_TYPES,
  VALID_SERVICE_SCOPES,
} = require('../src/services/snippet-resolver.service');

describe('content schema validation', () => {
  const contentPath = path.join(__dirname, '..', 'data', 'astrolumen_content_v1.json');
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));

  it('has the required top-level schema', () => {
    expect(content).toHaveProperty('meta');
    expect(typeof content.meta.content_version).toBe('string');
    expect(content).toHaveProperty('interpretation_library');
    expect(Array.isArray(content.interpretation_library.snippets)).toBe(true);
  });

  it('validates snippet schema, enums, and unique keys', () => {
    const keys = new Set();

    content.interpretation_library.snippets.forEach((snippet) => {
      expect(typeof snippet.key).toBe('string');
      expect(typeof snippet.type).toBe('string');
      expect(typeof snippet.title).toBe('string');
      expect(typeof snippet.text_md).toBe('string');

      expect(VALID_SNIPPET_TYPES.has(snippet.type)).toBe(true);

      if (snippet.tags !== undefined) {
        expect(Array.isArray(snippet.tags)).toBe(true);
        snippet.tags.forEach((tag) => expect(typeof tag).toBe('string'));
      }

      if (snippet.service_scopes !== undefined) {
        expect(Array.isArray(snippet.service_scopes)).toBe(true);
        snippet.service_scopes.forEach((scope) => {
          expect(VALID_SERVICE_SCOPES.has(scope)).toBe(true);
        });
      }

      expect(keys.has(snippet.key)).toBe(false);
      keys.add(snippet.key);
    });
  });
});
