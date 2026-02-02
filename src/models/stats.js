const createStats = ({
  interpretacoesRealizadas,
  mapasGerados,
  satisfacaoMedia,
  avaliacoes
}) => ({
  interpretacoes_realizadas: interpretacoesRealizadas,
  mapas_gerados: mapasGerados,
  satisfacao_media: satisfacaoMedia,
  avaliacoes
});

module.exports = {
  createStats
};
