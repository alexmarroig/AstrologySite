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
  ALLOWED_SERVICE_SCOPES,
  ALLOWED_SNIPPET_TYPES,
  CANONICAL_SECTIONS,
  REQUIRED_WHATSAPP,
  validateContent
};
