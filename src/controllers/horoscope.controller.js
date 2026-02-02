const horoscopeService = require('../services/horoscope.service');

const getDaily = (req, res) => {
  const sign = req.query.sign;
  const horoscope = horoscopeService.getDailyHoroscope(sign);

  if (!horoscope) {
    return res.status(400).json({ message: 'Signo inválido.' });
  }

  return res.json(horoscope);
};

module.exports = {
  getDaily
};
