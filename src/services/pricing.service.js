const PRICING = {
  'natal_chart': {
    service: 'natal_chart',
    price: 197.0,
    currency: 'BRL',
    description: 'Mapa Natal - Análise Profissional',
  },
  'solar_return': {
    service: 'solar_return',
    price: 167.0,
    currency: 'BRL',
    description: 'Retorno Solar - Análise do Ano',
  },
  'synastry': {
    service: 'synastry',
    price: 247.0,
    currency: 'BRL',
    description: 'Sinastria - Compatibilidade Profunda',
  },
  'predictions': {
    service: 'predictions',
    price: 227.0,
    currency: 'BRL',
    description: 'Previsões Astrológicas - Ciclos e Oportunidades',
  },
  'progressions': {
    service: 'progressions',
    price: 227.0,
    currency: 'BRL',
    description: 'Progressões Secundárias - Ciclos Internos',
  },
};

const getPricing = (serviceType) => PRICING[serviceType] || null;

module.exports = {
  getPricing,
  PRICING,
};
