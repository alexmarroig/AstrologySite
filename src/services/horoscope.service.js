const DAILY_MESSAGES = {
  aries: 'O dia favorece decisões conscientes e observação dos próprios impulsos.',
  taurus: 'Busque estabilidade emocional e mantenha o foco no que nutre seu bem-estar.',
  gemini: 'A comunicação flui melhor quando você escuta antes de responder.',
  cancer: 'Acolha suas emoções e respeite o tempo necessário para processar sentimentos.',
  leo: 'Seu brilho aparece quando você lidera com generosidade e escuta ativa.',
  virgo: 'Pequenos ajustes na rotina trarão mais clareza e eficiência.',
  libra: 'Equilíbrio nasce do diálogo honesto e da busca por cooperação.',
  scorpio: 'Transformações internas pedem silêncio e confiança no seu processo.',
  sagittarius: 'Abra espaço para novas ideias e direções com responsabilidade.',
  capricorn: 'Consistência e planejamento fortalecem seus próximos passos.',
  aquarius: 'Inove sem perder o senso de coletividade e propósito.',
  pisces: 'Sensibilidade em alta: cuide da sua energia e dos seus limites.'
};

const getDailyHoroscope = (sign) => {
  const key = (sign || '').toLowerCase();
  const texto = DAILY_MESSAGES[key];

  if (!texto) {
    return null;
  }

  const data = new Date().toISOString().split('T')[0];

  return {
    sign: key,
    texto,
    data
  };
};

module.exports = {
  getDailyHoroscope
};
