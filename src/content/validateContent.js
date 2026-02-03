const ALLOWED_SNIPPET_TYPES = new Set([
  'planet_sign',
  'planet_house',
  'planet_sign_house',
  'aspect',
  'aspect_house',
  'angle_sign',
  'house_sign',
  'theme',
  'disclaimer',
  'sr_planet_sign',
  'sr_planet_house',
  'sr_aspect',
  'sr_theme',
  'syn_aspect',
  'syn_overlay',
  'syn_theme',
  'transit',
  'transit_house',
  'transit_window',
  'pred_theme',
  'prog_planet_sign',
  'prog_planet_house',
  'prog_aspect',
  'prog_theme'
]);

const CANONICAL_SECTIONS = ['resumo', 'identidade', 'relacoes', 'carreira', 'ciclos'];
const ALLOWED_SNIPPET_TYPES = new Set([
  'planet_sign_house',
  'aspect_house',
  'planet_sign',
  'planet_house',
  'aspect'
]);
const ALLOWED_SERVICE_SCOPES = new Set([
  'natal',
  'solar_return',
  'synastry',
  'predictions',
  'progressions'
]);

const CANONICAL_SECTIONS = new Set([
  'cover',
  'disclaimer',
  'summary',
  'core_identity',
  'emotional',
  'relationships',
  'work_money',
  'growth_challenges',
  'year_themes',
  'health_energy',
  'timing_windows',
  'main_transits',
  'areas_of_life',
  'watchouts',
  'inner_cycles',
  'identity_shift',
  'emotional_shift',
  'core_dynamic',
  'strengths',
  'challenges',
  'communication',
  'intimacy_values',
  'practical_guidance',
  'closing'
]);

const REQUIRED_WHATSAPP =
  'https://web.whatsapp.com/send?phone=5511992953322&text=Olá%2C%20Estou%20interessada%20nos%20seus%20serviços%20astrológicos.%20Poderia%20me%20falar%20mais%20sobre%3F';

const validateContent = (content) => {
  const errors = [];

  if (!content?.meta?.content_version) {
    errors.push('meta.content_version ausente');
  }

  const whatsapp = content?.profile?.contato?.whatsapp;
  if (whatsapp !== REQUIRED_WHATSAPP) {
    errors.push('profile.contato.whatsapp inválido');
  }

  const services = content?.services || [];
  const serviceSlugs = new Set();
  services.forEach((service) => {
    if (serviceSlugs.has(service.slug)) {
      errors.push(`service.slug duplicado: ${service.slug}`);
    }
    serviceSlugs.add(service.slug);
  });

  const snippets = content?.interpretation_library?.snippets || [];
  const snippetKeys = new Set();

  snippets.forEach((snippet) => {
    if (!ALLOWED_SNIPPET_TYPES.has(snippet.type)) {
      errors.push(`snippet.type inválido: ${snippet.type}`);
    }
    if (typeof snippet.priority !== 'number' || snippet.priority < 0 || snippet.priority > 100) {
      errors.push(`snippet.priority inválido: ${snippet.key}`);
    }
    if (!Array.isArray(snippet.service_scopes) || snippet.service_scopes.length === 0) {
      errors.push(`snippet.service_scopes vazio: ${snippet.key}`);
    } else {
      snippet.service_scopes.forEach((scope) => {
        if (!ALLOWED_SERVICE_SCOPES.has(scope)) {
          errors.push(`snippet.service_scopes inválido: ${snippet.key}`);
        }
      });
    }
    if (!Array.isArray(snippet.sections) || snippet.sections.length === 0) {
      errors.push(`snippet.sections ausente: ${snippet.key}`);
    } else {
      snippet.sections.forEach((section) => {
        if (!CANONICAL_SECTIONS.has(section)) {
          errors.push(`snippet.sections inválida: ${snippet.key}`);
        }
      });
    }

    if (snippetKeys.has(snippet.key)) {
      errors.push(`snippet.key duplicado: ${snippet.key}`);
    }
    snippetKeys.add(snippet.key);
  });
const REQUIRED_WHATSAPP =
  'https://web.whatsapp.com/send?phone=5511992953322&text=Olá%2C%20Estou%20interessada%20nos%20seus%20serviços%20astrológicos.%20Poderia%20me%20falar%20mais%20sobre%3F';

const addError = (errors, path, message) => {
  errors.push({ path, message });
};

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const validateMeta = (errors, content) => {
  if (!isPlainObject(content.meta)) {
    addError(errors, 'meta', 'meta é obrigatório.');
    return;
  }

  if (!content.meta.content_version) {
    addError(errors, 'meta.content_version', 'meta.content_version é obrigatório.');
  }
};

const validateProfile = (errors, content) => {
  const contato = content.profile?.contato;
  if (!isPlainObject(contato)) {
    addError(errors, 'profile.contato', 'profile.contato é obrigatório.');
    return;
  }

  if (contato.whatsapp !== REQUIRED_WHATSAPP) {
    addError(
      errors,
      'profile.contato.whatsapp',
      'profile.contato.whatsapp deve ser o valor fixo exigido.'
    );
  }
};

const validateServices = (errors, content) => {
  if (!Array.isArray(content.services)) {
    return;
  }

  const slugs = new Set();
  content.services.forEach((service, index) => {
    const basePath = `services[${index}].slug`;
    if (!service || typeof service !== 'object' || !service.slug) {
      addError(errors, basePath, 'services[*].slug é obrigatório.');
      return;
    }

    if (slugs.has(service.slug)) {
      addError(errors, basePath, `Slug duplicado: ${service.slug}.`);
      return;
    }

    slugs.add(service.slug);
  });
};

const validateSnippets = (errors, content) => {
  const snippets = content.interpretation_library?.snippets;
  if (!Array.isArray(snippets)) {
    return;
  }

  const keys = new Set();
  const canonicalSections = new Set(CANONICAL_SECTIONS);

  snippets.forEach((snippet, index) => {
    const basePath = `interpretation_library.snippets[${index}]`;
    if (!snippet || typeof snippet !== 'object') {
      addError(errors, basePath, 'Snippet inválido.');
      return;
    }

    if (!ALLOWED_SNIPPET_TYPES.has(snippet.type)) {
      addError(errors, `${basePath}.type`, 'type inválido.');
    }

    if (!snippet.key) {
      addError(errors, `${basePath}.key`, 'key é obrigatório.');
    } else if (keys.has(snippet.key)) {
      addError(errors, `${basePath}.key`, `key duplicado: ${snippet.key}.`);
    } else {
      keys.add(snippet.key);
    }

    if (typeof snippet.priority !== 'number' || snippet.priority < 0 || snippet.priority > 100) {
      addError(errors, `${basePath}.priority`, 'priority deve estar entre 0 e 100.');
    }

    if (!Array.isArray(snippet.service_scopes) || snippet.service_scopes.length === 0) {
      addError(errors, `${basePath}.service_scopes`, 'service_scopes deve ser uma lista não vazia.');
    } else {
      snippet.service_scopes.forEach((scope, scopeIndex) => {
        if (!ALLOWED_SERVICE_SCOPES.has(scope)) {
          addError(
            errors,
            `${basePath}.service_scopes[${scopeIndex}]`,
            `service_scopes inválido: ${scope}.`
          );
        }
      });
    }

    if (!Array.isArray(snippet.sections)) {
      addError(errors, `${basePath}.sections`, 'sections deve ser uma lista.');
    } else {
      snippet.sections.forEach((section, sectionIndex) => {
        if (!canonicalSections.has(section)) {
          addError(
            errors,
            `${basePath}.sections[${sectionIndex}]`,
            `section inválida: ${section}.`
          );
        }
      });
    }
  });
};

const validateContent = (content) => {
  const errors = [];

  if (!isPlainObject(content)) {
    addError(errors, 'root', 'Conteúdo inválido.');
    return errors;
  }

  validateMeta(errors, content);
  validateProfile(errors, content);
  validateServices(errors, content);
  validateSnippets(errors, content);

  return errors;
};

module.exports = {
  validateContent,
  ALLOWED_SNIPPET_TYPES,
  ALLOWED_SERVICE_SCOPES,
  CANONICAL_SECTIONS,
  REQUIRED_WHATSAPP
  ALLOWED_SERVICE_SCOPES,
  ALLOWED_SNIPPET_TYPES,
  CANONICAL_SECTIONS,
  REQUIRED_WHATSAPP,
  validateContent
};
