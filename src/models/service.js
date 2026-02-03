const createService = ({
  slug,
  nome,
  resumo,
  preco,
  imagem,
  descricaoCompleta,
  linksArtigos = [],
  categorias = ['astrologia'],
  tipoEntrega = 'relatorio-digital'
}) => ({
  slug,
  nome,
  resumo,
  preco,
  imagem,
  descricao_completa: descricaoCompleta,
  links_artigos: linksArtigos,
  categorias,
  tipo_entrega: tipoEntrega
});

module.exports = {
  createService
};
