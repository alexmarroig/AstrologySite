const fs = require('fs');
const path = require('path');

const CONTENT_PATH = path.join(__dirname, '..', '..', 'data', 'astrolumen_content_v1.json');

const readContentFile = () => {
  const raw = fs.readFileSync(CONTENT_PATH, 'utf-8');
  return JSON.parse(raw);
};

const writeContentFile = (content) => {
  fs.writeFileSync(CONTENT_PATH, `${JSON.stringify(content, null, 2)}\n`, 'utf-8');
};

const isObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));

const validateString = (value) => typeof value === 'string' && value.trim().length > 0;

const validateArrayOfStrings = (value) =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const validateFaqItem = (item) => isObject(item) && validateString(item.q) && validateString(item.a);

const validateSnippet = (snippet) => {
  if (!isObject(snippet)) {
    return false;
  }
  if (!validateString(snippet.type)) {
    return false;
  }
  if (!validateString(snippet.key)) {
    return false;
  }
  if (!validateString(snippet.title)) {
    return false;
  }
  if (!validateString(snippet.text_md)) {
    return false;
  }
  if (snippet.priority !== undefined && typeof snippet.priority !== 'number') {
    return false;
  }
  if (snippet.service_scopes !== undefined && !validateArrayOfStrings(snippet.service_scopes)) {
    return false;
  }
  if (snippet.tags !== undefined && !validateArrayOfStrings(snippet.tags)) {
    return false;
  }
  return true;
};

const validateContentSchema = (content) => {
  const errors = [];

  if (!isObject(content)) {
    errors.push('Conteúdo deve ser um objeto JSON.');
    return errors;
  }

  if (!isObject(content.meta)) {
    errors.push('meta é obrigatório.');
  } else {
    if (!validateString(content.meta.content_version)) {
      errors.push('meta.content_version é obrigatório.');
    }
    if (!validateString(content.meta.lang)) {
      errors.push('meta.lang é obrigatório.');
    }
    if (!validateString(content.meta.last_updated)) {
      errors.push('meta.last_updated é obrigatório.');
    }
  }

  if (!isObject(content.profile)) {
    errors.push('profile é obrigatório.');
  } else {
    if (!validateString(content.profile.nome)) {
      errors.push('profile.nome é obrigatório.');
    }
    if (!validateString(content.profile.titulo)) {
      errors.push('profile.titulo é obrigatório.');
    }
    if (!validateString(content.profile.foto)) {
      errors.push('profile.foto é obrigatório.');
    }
    if (!validateString(content.profile.formacao)) {
      errors.push('profile.formacao é obrigatório.');
    }
    if (content.profile.inicio_estudos === undefined || typeof content.profile.inicio_estudos !== 'number') {
      errors.push('profile.inicio_estudos deve ser número.');
    }
    if (!validateString(content.profile.experiencia)) {
      errors.push('profile.experiencia é obrigatório.');
    }
    if (!validateString(content.profile.abordagem)) {
      errors.push('profile.abordagem é obrigatório.');
    }
    if (!validateString(content.profile.biografia_curta)) {
      errors.push('profile.biografia_curta é obrigatório.');
    }
    if (!validateString(content.profile.biografia_longa)) {
      errors.push('profile.biografia_longa é obrigatório.');
    }
    if (!validateString(content.profile.missao)) {
      errors.push('profile.missao é obrigatório.');
    }
    if (!isObject(content.profile.citacao)) {
      errors.push('profile.citacao é obrigatório.');
    } else {
      if (!validateString(content.profile.citacao.autor)) {
        errors.push('profile.citacao.autor é obrigatório.');
      }
      if (!validateString(content.profile.citacao.texto)) {
        errors.push('profile.citacao.texto é obrigatório.');
      }
    }
    if (!isObject(content.profile.contato)) {
      errors.push('profile.contato é obrigatório.');
    } else {
      if (!validateString(content.profile.contato.whatsapp)) {
        errors.push('profile.contato.whatsapp é obrigatório.');
      }
      if (!validateString(content.profile.contato.instagram)) {
        errors.push('profile.contato.instagram é obrigatório.');
      }
      if (!validateString(content.profile.contato.email)) {
        errors.push('profile.contato.email é obrigatório.');
      }
    }
  }

  if (!isObject(content.stats)) {
    errors.push('stats é obrigatório.');
  } else {
    if (typeof content.stats.interpretacoes !== 'number') {
      errors.push('stats.interpretacoes deve ser número.');
    }
    if (typeof content.stats.mapas_gerados !== 'number') {
      errors.push('stats.mapas_gerados deve ser número.');
    }
    if (typeof content.stats.avaliacao_media !== 'number') {
      errors.push('stats.avaliacao_media deve ser número.');
    }
    if (typeof content.stats.anos_experiencia !== 'number') {
      errors.push('stats.anos_experiencia deve ser número.');
    }
    if (!validateString(content.stats.prazo_medio_entrega)) {
      errors.push('stats.prazo_medio_entrega é obrigatório.');
    }
  }

  if (!Array.isArray(content.services)) {
    errors.push('services deve ser uma lista.');
  } else {
    content.services.forEach((service, index) => {
      if (!isObject(service)) {
        errors.push(`services[${index}] deve ser objeto.`);
        return;
      }
      if (!validateString(service.slug)) {
        errors.push(`services[${index}].slug é obrigatório.`);
      }
      if (!validateString(service.nome)) {
        errors.push(`services[${index}].nome é obrigatório.`);
      }
      if (typeof service.preco !== 'number') {
        errors.push(`services[${index}].preco deve ser número.`);
      }
      if (!validateString(service.prazo_entrega)) {
        errors.push(`services[${index}].prazo_entrega é obrigatório.`);
      }
      if (!validateString(service.resumo)) {
        errors.push(`services[${index}].resumo é obrigatório.`);
      }
      if (!validateString(service.descricao)) {
        errors.push(`services[${index}].descricao é obrigatório.`);
      }
      if (!validateArrayOfStrings(service.para_quem_e)) {
        errors.push(`services[${index}].para_quem_e deve ser lista de strings.`);
      }
      if (!validateArrayOfStrings(service.inclui)) {
        errors.push(`services[${index}].inclui deve ser lista de strings.`);
      }
      if (!validateArrayOfStrings(service.como_funciona)) {
        errors.push(`services[${index}].como_funciona deve ser lista de strings.`);
      }
      if (!validateArrayOfStrings(service.beneficios)) {
        errors.push(`services[${index}].beneficios deve ser lista de strings.`);
      }
      if (!Array.isArray(service.faq) || !service.faq.every(validateFaqItem)) {
        errors.push(`services[${index}].faq deve ser lista de perguntas e respostas.`);
      }
      if (!validateString(service.cta_label)) {
        errors.push(`services[${index}].cta_label é obrigatório.`);
      }
      if (!validateString(service.imagem)) {
        errors.push(`services[${index}].imagem é obrigatório.`);
      }
      if (!validateArrayOfStrings(service.tags)) {
        errors.push(`services[${index}].tags deve ser lista de strings.`);
      }
    });
  }

  if (!Array.isArray(content.faq) || !content.faq.every(validateFaqItem)) {
    errors.push('faq deve ser lista de perguntas e respostas.');
  }

  if (!isObject(content.interpretation_library)) {
    errors.push('interpretation_library é obrigatório.');
  } else if (!Array.isArray(content.interpretation_library.snippets)) {
    errors.push('interpretation_library.snippets deve ser lista.');
  } else if (!content.interpretation_library.snippets.every(validateSnippet)) {
    errors.push('Todos os snippets devem ter campos obrigatórios válidos.');
  }

  const snippets = content.interpretation_library?.snippets || [];
  const keys = snippets.map((snippet) => snippet.key);
  const uniqueKeys = new Set(keys);
  if (keys.length !== uniqueKeys.size) {
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    errors.push(`Chaves duplicadas em snippets: ${[...new Set(duplicates)].join(', ')}`);
  }

  return errors;
};

const ensureUniqueSnippetKey = (snippets, key, ignoreIndex = null) => {
  return !snippets.some((snippet, index) => snippet.key === key && index !== ignoreIndex);
};

const exportContent = (req, res) => {
  try {
    const content = readContentFile();
    return res.json(content);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao exportar conteúdo.', error: error.message });
  }
};

const importContent = (req, res) => {
  const content = req.body;
  const errors = validateContentSchema(content);

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Schema inválido.', errors });
  }

  try {
    writeContentFile(content);
    return res.status(201).json({ message: 'Conteúdo importado com sucesso.' });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao importar conteúdo.', error: error.message });
  }
};

const listSnippets = (req, res) => {
  try {
    const content = readContentFile();
    return res.json(content.interpretation_library?.snippets || []);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar snippets.', error: error.message });
  }
};

const createSnippet = (req, res) => {
  const snippet = req.body;

  if (!validateSnippet(snippet)) {
    return res.status(400).json({ message: 'Snippet inválido.' });
  }

  try {
    const content = readContentFile();
    const snippets = content.interpretation_library?.snippets || [];

    if (!ensureUniqueSnippetKey(snippets, snippet.key)) {
      return res.status(409).json({ message: 'Já existe snippet com esta key.' });
    }

    const nextSnippets = [...snippets, snippet];
    const nextContent = {
      ...content,
      interpretation_library: {
        ...content.interpretation_library,
        snippets: nextSnippets
      }
    };

    writeContentFile(nextContent);
    return res.status(201).json(snippet);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao criar snippet.', error: error.message });
  }
};

const updateSnippet = (req, res) => {
  const { key, ...updates } = req.body || {};

  if (!validateString(key)) {
    return res.status(400).json({ message: 'Key do snippet é obrigatória.' });
  }

  try {
    const content = readContentFile();
    const snippets = content.interpretation_library?.snippets || [];
    const snippetIndex = snippets.findIndex((snippet) => snippet.key === key);

    if (snippetIndex === -1) {
      return res.status(404).json({ message: 'Snippet não encontrado.' });
    }

    const nextKey = updates.key || key;

    if (!ensureUniqueSnippetKey(snippets, nextKey, snippetIndex)) {
      return res.status(409).json({ message: 'Já existe snippet com esta key.' });
    }

    const mergedSnippet = {
      ...snippets[snippetIndex],
      ...updates,
      key: nextKey
    };

    if (!validateSnippet(mergedSnippet)) {
      return res.status(400).json({ message: 'Snippet atualizado inválido.' });
    }

    const nextSnippets = [...snippets];
    nextSnippets[snippetIndex] = mergedSnippet;

    const nextContent = {
      ...content,
      interpretation_library: {
        ...content.interpretation_library,
        snippets: nextSnippets
      }
    };

    writeContentFile(nextContent);
    return res.json(mergedSnippet);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar snippet.', error: error.message });
  }
};

module.exports = {
  exportContent,
  importContent,
  listSnippets,
  createSnippet,
  updateSnippet
};
