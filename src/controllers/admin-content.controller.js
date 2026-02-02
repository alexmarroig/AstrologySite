const contentStore = require('../services/content-store.service');

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const normalizeText = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

const resolveSnippetSection = (snippet) => contentStore.resolveSnippetSection(snippet);

const exportContent = (req, res) => {
  const version = req.query.version || 'v1';

  try {
    const content = contentStore.getContent(version);
    return res.json(content);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao exportar conteúdo.', error: error.message });
  }
};

const importContent = (req, res) => {
  const content = req.body;

  if (!isPlainObject(content)) {
    return res.status(400).json({ message: 'JSON inválido. O corpo deve ser um objeto.' });
  }

  const errors = contentStore.validateContent(content);

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Schema inválido.', errors });
  }

  const version = content.meta?.content_version || 'v1';

  if (typeof version !== 'string' || !version.trim()) {
    return res.status(400).json({ message: 'meta.content_version deve ser uma string válida.' });
  }

  try {
    contentStore.writeContent(content, version);
    return res.status(201).json({ message: 'Conteúdo importado com sucesso.', version });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao importar conteúdo.', error: error.message });
  }
};

const listSnippets = (req, res) => {
  const { query, type, service, section } = req.query;
  const normalizedQuery = normalizeText(query);

  try {
    let snippets = contentStore.getSnippets();

    if (type) {
      snippets = snippets.filter((snippet) => snippet.type === type);
    }

    if (service) {
      snippets = snippets.filter((snippet) =>
        Array.isArray(snippet.service_scopes) ? snippet.service_scopes.includes(service) : false
      );
    }

    if (section) {
      snippets = snippets.filter((snippet) => resolveSnippetSection(snippet) === section);
    }

    if (normalizedQuery) {
      snippets = snippets.filter((snippet) => {
        const haystack = [
          snippet.key,
          snippet.title,
          snippet.text_md,
          ...(Array.isArray(snippet.tags) ? snippet.tags : [])
        ]
          .map(normalizeText)
          .join(' ');
        return haystack.includes(normalizedQuery);
      });
    }

    return res.json(snippets);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar snippets.', error: error.message });
  }
};

const createSnippet = (req, res) => {
  const snippet = req.body;

  if (!isPlainObject(snippet)) {
    return res.status(400).json({ message: 'Snippet inválido.' });
  }

  try {
    const content = contentStore.getContent();
    const snippets = content.interpretation_library?.snippets || [];

    if (snippets.some((entry) => entry.key === snippet.key)) {
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

    const errors = contentStore.validateContent(nextContent);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Snippet inválido.', errors });
    }

    const version = nextContent.meta?.content_version || 'v1';
    contentStore.writeContent(nextContent, version);

    return res.status(201).json(snippet);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao criar snippet.', error: error.message });
  }
};

const updateSnippet = (req, res) => {
  const key = req.params.key;
  const updates = req.body || {};

  if (typeof key !== 'string' || !key.trim()) {
    return res.status(400).json({ message: 'Key do snippet é obrigatória.' });
  }

  if (!isPlainObject(updates)) {
    return res.status(400).json({ message: 'Atualizações inválidas.' });
  }

  try {
    const content = contentStore.getContent();
    const snippets = content.interpretation_library?.snippets || [];
    const snippetIndex = snippets.findIndex((snippet) => snippet.key === key);

    if (snippetIndex === -1) {
      return res.status(404).json({ message: 'Snippet não encontrado.' });
    }

    const nextKey = updates.key || key;

    if (snippets.some((snippet, index) => snippet.key === nextKey && index !== snippetIndex)) {
      return res.status(409).json({ message: 'Já existe snippet com esta key.' });
    }

    const mergedSnippet = {
      ...snippets[snippetIndex],
      ...updates,
      key: nextKey
    };

    const nextSnippets = [...snippets];
    nextSnippets[snippetIndex] = mergedSnippet;

    const nextContent = {
      ...content,
      interpretation_library: {
        ...content.interpretation_library,
        snippets: nextSnippets
      }
    };

    const errors = contentStore.validateContent(nextContent);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Snippet atualizado inválido.', errors });
    }

    const version = nextContent.meta?.content_version || 'v1';
    contentStore.writeContent(nextContent, version);

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
