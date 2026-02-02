const content = require('../../data/astrolumen_content_v1.json');

const getHoroscope = (sign) => {
  const key = (sign || '').toLowerCase();
  const daily = content.horoscope && content.horoscope.daily ? content.horoscope.daily : {};
  return daily[key] || null;
};

module.exports = {
  getHoroscope
};
