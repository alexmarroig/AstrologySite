const contentStore = require('../content/contentStore');

const getDailyHoroscope = (sign) => {
  const key = (sign || '').toLowerCase();
  const texto = contentStore.getHoroscopeDaily(key);

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
