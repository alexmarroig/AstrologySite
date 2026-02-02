const createPost = ({
  id,
  titulo,
  resumo,
  imagem,
  autor,
  dataPublicacao,
  conteudo,
  tags = []
}) => ({
  id,
  titulo,
  resumo,
  imagem,
  autor,
  data_publicacao: dataPublicacao,
  conteudo,
  tags
});

module.exports = {
  createPost
};
