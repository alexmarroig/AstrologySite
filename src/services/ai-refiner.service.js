const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DEFAULT_MAX_CHARS = 6000;
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_MAX_TOKENS = 800;

const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

const parseBoolean = (value, defaultValue) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return !FALSE_VALUES.has(String(value).toLowerCase());
};

const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

class AIRefinerService {
  async refineWithAI(text, tokens, constraints) {
    if (!text) {
      return text;
    }

    const enabled = parseBoolean(process.env.AI_REFINER_ENABLED, true);
    if (!enabled) {
      return text;
    }

    if (!process.env.OPENAI_API_KEY) {
      return text;
    }

    const maxChars = parseNumber(process.env.AI_REFINER_MAX_CHARS, DEFAULT_MAX_CHARS);
    if (text.length > maxChars) {
      return text;
    }

    const model = process.env.AI_REFINER_MODEL || DEFAULT_MODEL;
    const temperature = Number.parseFloat(process.env.AI_REFINER_TEMPERATURE ?? DEFAULT_TEMPERATURE);
    const maxTokens = Number.isFinite(tokens)
      ? tokens
      : parseNumber(process.env.AI_REFINER_MAX_TOKENS, DEFAULT_MAX_TOKENS);

    const constraintLines = this._formatConstraints(constraints);

    const systemPrompt = [
      'Você é um refinador de texto estrito.',
      'Sua tarefa é SOMENTE refinar o texto fornecido pelo usuário.',
      'Não adicione novas informações, fatos ou interpretações.',
      'Não responda perguntas, não explique o que fez, não inclua prefácios.',
      'Mantenha o sentido original, corrigindo apenas clareza, fluidez, gramática e estilo.',
      'Responda apenas com o texto refinado, sem aspas ou marcadores adicionais.',
      constraintLines ? `Restrições adicionais:\n${constraintLines}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const userPrompt = `Texto para refinar (não altere o significado):\n\n${text}`;

    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0]?.message?.content?.trim() || text;
    } catch (error) {
      return text;
    }
  }

  _formatConstraints(constraints) {
    if (!constraints) {
      return '';
    }

    if (Array.isArray(constraints)) {
      return constraints.filter(Boolean).join('\n');
    }

    if (typeof constraints === 'string') {
      return constraints.trim();
    }

    return '';
  }
}

module.exports = new AIRefinerService();
