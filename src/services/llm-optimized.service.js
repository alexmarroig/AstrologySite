const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class LLMOptimizedService {
  async synthesizeNatalChart(chartData, interpretations, userName) {
    const prompt = this._buildSynthesisPrompt(interpretations, userName, chartData);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Você é uma astróloga expert. Sintetize as interpretações em um relatório profundo e inspirador. Linguagem poética mas objetiva.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0].message.content;
  }

  async synthesizeSolarReturn(chartData, interpretations, userName) {
    const prompt = this._buildSolarSynthesisPrompt(interpretations, userName, chartData);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é astróloga especialista. Sintetize em um guia para o próximo ano.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0].message.content;
  }

  _buildSynthesisPrompt(interpretations, userName, chartData) {
    let prompt = `SINTETIZE EM UM RELATÓRIO PARA ${userName}:\n\n`;

    for (const [planetName, data] of Object.entries(interpretations.planets)) {
      if (['sun', 'moon', 'venus', 'mars'].includes(planetName)) {
        prompt += `${planetName.toUpperCase()} em ${data.sign}:\n${data.interpretation}\n\n`;
      }
    }

    if (interpretations.houses.house1) {
      prompt += `ASCENDENTE em ${interpretations.houses.house1.sign}:\n${interpretations.houses.house1.interpretation}\n\n`;
    }

    for (const aspect of interpretations.aspects.slice(0, 3)) {
      prompt += `${aspect.planet1} ${aspect.type} ${aspect.planet2}:\n${aspect.interpretation}\n\n`;
    }

    prompt += `\nESTRUTURE COMO:\n1. RESUMO PESSOAL\n2. SOL\n3. LUA\n4. ASCENDENTE\n5. ASPECTOS\n6. RECOMENDAÇÕES`;

    prompt += `\n\nMETADADOS:\nLocal: ${chartData.location}\nData: ${chartData.birthDate} ${chartData.birthTime}`;

    return prompt;
  }

  _buildSolarSynthesisPrompt(interpretations, userName) {
    return `Sintetize este ano astrológico para ${userName} com base nas interpretações abaixo:\n\n${JSON.stringify(interpretations, null, 2)}`;
  }
}

module.exports = new LLMOptimizedService();
