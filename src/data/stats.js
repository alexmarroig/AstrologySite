const { createStats } = require('../models/stats');

const stats = createStats({
  interpretacoesRealizadas: 881,
  mapasGerados: 1200,
  satisfacaoMedia: 4.9,
  avaliacoes: 312
});

module.exports = {
  stats
};
