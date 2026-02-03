const VALID_SNIPPET_TYPES = new Set(['text', 'planet_sign', 'house_sign', 'aspect', 'planet_sign_house', 'aspect_house', 'planet_house']);
const VALID_SERVICE_SCOPES = new Set(['natal', 'solar_return', 'synastry', 'predictions', 'progressions']);

/**
 * Resolve snippets based on chart tokens and service type
 * @param {Array} tokens - List of tokens from tokenizer
 * @param {string} serviceType - Service type slug
 * @param {string} contentVersion - Version of the content library
 * @param {Array} snippets - Library of available snippets
 */
const resolveSnippets = (tokens, serviceType, contentVersion, snippets) => {
  if (!tokens || !Array.isArray(tokens)) {
    return { content_version: contentVersion, sections: {} };
  }

  const sections = {};

  // Simple resolver logic based on matching keys in tokens and snippets
  tokens.forEach((token) => {
    const matchedSnippets = snippets.filter((s) => {
      const scopeMatch = s.scopes ? s.scopes.includes(serviceType) : true;
      const keyMatch = s.key === token.key;
      return scopeMatch && keyMatch;
    });

    if (matchedSnippets.length > 0) {
      const sectionId = token.section || 'general';
      if (!sections[sectionId]) {
        sections[sectionId] = [];
      }
      sections[sectionId].push(...matchedSnippets);
    }
  });

  return {
    content_version: contentVersion,
    sections
  };
};

module.exports = {
  resolveSnippets,
  VALID_SNIPPET_TYPES,
  VALID_SERVICE_SCOPES
};
