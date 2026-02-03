const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateContent, REQUIRED_WHATSAPP } = require('../src/content/validateContent');
const baseContent = require('../data/astrolumen_content_v1.json');

const clone = (value) => JSON.parse(JSON.stringify(value));

test('validateContent rejeita type inválido', () => {
  const content = clone(baseContent);
  content.interpretation_library.snippets[0].type = 'invalid_type';
  const errors = validateContent(content);
  assert.ok(errors.some((err) => err.includes('snippet.type inválido')));
});

test('validateContent rejeita key duplicada', () => {
  const content = clone(baseContent);
  const snippet = clone(baseContent.interpretation_library.snippets[0]);
  content.interpretation_library.snippets.push(snippet);
  const errors = validateContent(content);
  assert.ok(errors.some((err) => err.includes('snippet.key duplicado')));
});

test('validateContent rejeita section não canônica', () => {
  const content = clone(baseContent);
  content.interpretation_library.snippets[0].sections = ['invalid_section'];
  const errors = validateContent(content);
  assert.ok(errors.some((err) => err.includes('snippet.sections inválida')));
});

test('validateContent rejeita whatsapp diferente do valor fixo', () => {
  const content = clone(baseContent);
  content.profile.contato.whatsapp = `${REQUIRED_WHATSAPP}-diff`;
  const errors = validateContent(content);
  assert.ok(errors.some((err) => err.includes('profile.contato.whatsapp inválido')));
describe('validateContent', () => {
  test('rejeita type inválido', () => {
    const content = clone(baseContent);
    content.interpretation_library.snippets[0].type = 'invalid_type';
    const errors = validateContent(content);
    expect(errors.some((err) => err.includes('snippet.type inválido'))).toBe(true);
  });

  test('rejeita key duplicada', () => {
    const content = clone(baseContent);
    const snippet = clone(baseContent.interpretation_library.snippets[0]);
    content.interpretation_library.snippets.push(snippet);
    const errors = validateContent(content);
    expect(errors.some((err) => err.includes('snippet.key duplicado'))).toBe(true);
  });

  test('rejeita section não canônica', () => {
    const content = clone(baseContent);
    content.interpretation_library.snippets[0].sections = ['invalid_section'];
    const errors = validateContent(content);
    expect(errors.some((err) => err.includes('snippet.sections inválida'))).toBe(true);
  });

  test('rejeita whatsapp diferente do valor fixo', () => {
    const content = clone(baseContent);
    content.profile.contato.whatsapp = `${REQUIRED_WHATSAPP}-diff`;
    const errors = validateContent(content);
    expect(errors.some((err) => err.includes('profile.contato.whatsapp inválido'))).toBe(true);
  });
});
