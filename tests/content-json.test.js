const fs = require('fs');
const path = require('path');

describe('astrolumen_content_v1.json', () => {
  const contentPath = path.join(__dirname, '..', 'data', 'astrolumen_content_v1.json');
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

  const expectString = (value) => expect(typeof value).toBe('string');
  const expectNumber = (value) => expect(typeof value).toBe('number');

  test('has required top-level structure', () => {
    expect(content).toHaveProperty('meta');
    expect(content).toHaveProperty('profile');
    expect(content).toHaveProperty('stats');
    expect(content).toHaveProperty('services');
    expect(content).toHaveProperty('faq');
    expect(content).toHaveProperty('interpretation_library');
  });

  test('meta section includes required fields', () => {
    const meta = content.meta;
    expectString(meta.content_version);
    expectString(meta.lang);
    expectString(meta.last_updated);
    expectString(meta.notes);
  });

  test('profile section includes required fields', () => {
    const profile = content.profile;
    expectString(profile.nome);
    expectString(profile.titulo);
    expectString(profile.foto);
    expectString(profile.formacao);
    expect(typeof profile.inicio_estudos).toBe('number');
    expectString(profile.experiencia);
    expectString(profile.abordagem);
    expectString(profile.biografia_curta);
    expectString(profile.biografia_longa);
    expectString(profile.missao);
    expect(profile).toHaveProperty('citacao');
    expectString(profile.citacao.autor);
    expectString(profile.citacao.texto);
    expect(profile).toHaveProperty('contato');
    expectString(profile.contato.whatsapp);
    expectString(profile.contato.instagram);
    expectString(profile.contato.email);
  });

  test('profile contato whatsapp matches fixed value', () => {
    expect(content.profile.contato.whatsapp).toBe(
      'https://web.whatsapp.com/send?phone=5511992953322&text=Olá%2C%20Estou%20interessada%20nos%20seus%20serviços%20astrológicos.%20Poderia%20me%20falar%20mais%20sobre%3F'
    );
  });

  test('stats section includes required fields', () => {
    const stats = content.stats;
    expectNumber(stats.interpretacoes);
    expectNumber(stats.mapas_gerados);
    expectNumber(stats.avaliacao_media);
    expectNumber(stats.anos_experiencia);
    expectString(stats.prazo_medio_entrega);
  });

  test('services entries include required fields', () => {
    expect(Array.isArray(content.services)).toBe(true);
    expect(content.services.length).toBeGreaterThan(0);

    for (const service of content.services) {
      expectString(service.slug);
      expectString(service.nome);
      expectNumber(service.preco);
      expectString(service.prazo_entrega);
      expectString(service.resumo);
      expectString(service.descricao);
      expect(Array.isArray(service.para_quem_e)).toBe(true);
      expect(Array.isArray(service.inclui)).toBe(true);
      expect(Array.isArray(service.como_funciona)).toBe(true);
      expect(Array.isArray(service.beneficios)).toBe(true);
      expect(Array.isArray(service.faq)).toBe(true);
      for (const item of service.faq) {
        expectString(item.q);
        expectString(item.a);
      }
      expectString(service.cta_label);
      expectString(service.imagem);
      expect(Array.isArray(service.tags)).toBe(true);
    }
  });

  test('faq entries include required fields', () => {
    expect(Array.isArray(content.faq)).toBe(true);
    expect(content.faq.length).toBeGreaterThan(0);
    for (const item of content.faq) {
      expectString(item.q);
      expectString(item.a);
    }
  });

  test('interpretation library snippets include required fields', () => {
    const { interpretation_library: library } = content;
    expect(library).toHaveProperty('snippets');
    expect(Array.isArray(library.snippets)).toBe(true);

    for (const snippet of library.snippets) {
      expectString(snippet.type);
      expectString(snippet.key);
      expectString(snippet.title);
      expectString(snippet.text_md);
      expect(typeof snippet.priority).toBe('number');
      expect(Array.isArray(snippet.service_scopes)).toBe(true);
      expect(Array.isArray(snippet.tags)).toBe(true);
    }
  });
});
