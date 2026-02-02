const posts = [
  {
    id: 1,
    titulo: 'Mercúrio retrógrado: mitos e verdades',
    resumo: 'Entenda como Mercúrio retrógrado afeta comunicação e contratos.',
    conteudo: `# Mercúrio retrógrado\n\nMercúrio retrógrado é um convite à revisão. Em vez de medo, pense em ajustes finos, reavaliação de contratos e comunicação mais consciente.\n\n## Pontos-chave\n- Releia e renegocie antes de fechar acordos importantes.\n- Evite decisões impulsivas e revise mensagens.\n- Use o período para reorganizar rotinas e ideias.`,
    autor: 'Camila Veloso',
    data_publicacao: '2024-05-10',
    imagem: '/images/posts/mercurio-retrogrado.png'
  },
  {
    id: 2,
    titulo: 'Eclipses: por que eles mexem tanto com a gente?',
    resumo: 'Saiba como eclipses ativam ciclos e mudanças profundas.',
    conteudo: `# Eclipses e viradas de ciclo\n\nEclipses são portais de mudança. Eles aceleram processos e pedem desapego do que não faz mais sentido.\n\n## Como se preparar\n- Observe as casas ativadas no seu mapa.\n- Defina intenções claras para o próximo semestre.\n- Cuide do corpo e da mente para absorver as transformações.`,
    autor: 'Camila Veloso',
    data_publicacao: '2024-06-02',
    imagem: '/images/posts/eclipses.png'
  },
  {
    id: 3,
    titulo: 'Lua em Touro: segurança emocional e prazer',
    resumo: 'Uma leitura sobre conforto, estabilidade e autocuidado.',
    conteudo: `# Lua em Touro\n\nQuem tem Lua em Touro busca estabilidade e aprecia pequenos rituais de prazer. Essa posição fala de constância emocional e autocuidado através do corpo.\n\n## Dicas práticas\n- Crie rotinas de descanso e alimentação consciente.\n- Valorize vínculos seguros e duradouros.\n- Invista em ambientes confortáveis e acolhedores.`,
    autor: 'Camila Veloso',
    data_publicacao: '2024-07-15',
    imagem: '/images/posts/lua-em-touro.png'
  }
];

const listPostSummaries = () =>
  posts.map(({ id, titulo, resumo, autor, data_publicacao, imagem }) => ({
    id,
    titulo,
    resumo,
    autor,
    data_publicacao,
    imagem
  }));

const findPostById = (id) => posts.find((post) => post.id === Number(id));

module.exports = {
  posts,
  listPostSummaries,
  findPostById
};
