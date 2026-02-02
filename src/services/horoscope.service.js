const { getHoroscopeDaily } = require('./content.service');

const getDailyHoroscope = (sign) => {
  const key = (sign || '').toLowerCase();
  const texto = getHoroscopeDaily(key);

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
