const createProfile = ({
  nome,
  foto,
  formacao,
  experiencia,
  biografia,
  citacao,
  contato,
  redesSociais,
  beneficios,
  faq
}) => ({
  nome,
  foto,
  formacao,
  experiencia,
  biografia,
  citacao,
  contato,
  redes_sociais: redesSociais,
  beneficios,
  faq
});

module.exports = {
  createProfile
};
