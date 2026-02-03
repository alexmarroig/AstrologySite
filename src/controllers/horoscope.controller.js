const horoscopeService = require('../services/horoscope.service');

const getDaily = (req, res) => {
  try {
    const sign = req.query.sign;
    const horoscope = horoscopeService.getDailyHoroscope(sign);

    if (!horoscope) {
      return res.status(400).json({ message: 'Signo inválido.' });
    }

    return res.json(horoscope);
  } catch (error) {
    console.error('Erro ao carregar horóscopo:', error);
    return res.status(500).json({ message: 'Horóscopo indisponível no momento.' });
  }
};

module.exports = {
  getDaily
};
