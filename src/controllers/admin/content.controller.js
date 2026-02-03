const contentStore = require('../../content/contentStore');
const fs = require('fs');
const path = require('path');

const CONTENT_PATH = path.join(__dirname, '..', '..', '..', 'data', 'astrolumen_content_v1.json');

const exportContent = (req, res) => {
  try {
    const raw = fs.readFileSync(CONTENT_PATH, 'utf-8');
    return res.json(JSON.parse(raw));
  } catch (error) {
    console.error('Erro ao exportar conteúdo:', error);
    return res.status(500).json({ error: 'Falha ao exportar conteúdo' });
  }
};

const importContent = (req, res) => {
  const payload = req.body;
  const result = contentStore.replaceContent(payload);
  if (!result.ok) {
    return res.status(400).json({ error: 'Conteúdo inválido', details: result.errors });
  }
  return res.json({ status: 'ok', content_version: payload?.meta?.content_version });
};

const listSnippets = (req, res) => {
  try {
    const query = (req.query.query || '').toLowerCase();
    const type = req.query.type;
    const service = req.query.service;
    const section = req.query.section;

    const results = contentStore.getAllSnippets().filter((snippet) => {
      if (query) {
        const haystack = `${snippet.title} ${snippet.key} ${snippet.text_md}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      if (type && snippet.type !== type) {
        return false;
      }
      if (service && !snippet.service_scopes?.includes(service)) {
        return false;
      }
      if (section && !snippet.sections?.includes(section)) {
        return false;
      }
      return true;
    });

    return res.json(results);
  } catch (error) {
    console.error('Erro ao listar snippets:', error);
    return res.status(500).json({ error: 'Falha ao listar snippets' });
  }
};

const addSnippet = (req, res) => {
  try {
    const raw = fs.readFileSync(CONTENT_PATH, 'utf-8');
    const payload = JSON.parse(raw);
    payload.interpretation_library.snippets.push(req.body);
    const result = contentStore.replaceContent(payload);
    if (!result.ok) {
      return res.status(400).json({ error: 'Snippet inválido', details: result.errors });
    }
    return res.status(201).json({ status: 'ok', key: req.body.key });
  } catch (error) {
    console.error('Erro ao adicionar snippet:', error);
    return res.status(500).json({ error: 'Falha ao adicionar snippet' });
  }
};

const updateSnippet = (req, res) => {
  try {
    const key = req.params.key;
    const raw = fs.readFileSync(CONTENT_PATH, 'utf-8');
    const payload = JSON.parse(raw);
    const index = payload.interpretation_library.snippets.findIndex(
      (snippet) => snippet.key === key
    );
    if (index === -1) {
      return res.status(404).json({ error: 'Snippet não encontrado' });
    }
    payload.interpretation_library.snippets[index] = {
      ...payload.interpretation_library.snippets[index],
      ...req.body,
      key
    };
    const result = contentStore.replaceContent(payload);
    if (!result.ok) {
      return res.status(400).json({ error: 'Snippet inválido', details: result.errors });
    }
    return res.json({ status: 'ok', key });
  } catch (error) {
    console.error('Erro ao atualizar snippet:', error);
    return res.status(500).json({ error: 'Falha ao atualizar snippet' });
  }
};

module.exports = {
  exportContent,
  importContent,
  listSnippets,
  addSnippet,
  updateSnippet
};
