const { createProfile } = require('../models/profile');

const profile = createProfile({
  nome: 'Camila Veloso',
  foto: 'https://cdn.astrolumen.com/team/camila-veloso.jpg',
  formacao: 'Astróloga formada pela escola GAIA, com foco em astrologia psicológica e simbólica.',
  experiencia: 'Estuda astrologia desde o final de 2019, com prática contínua em atendimentos e produção de conteúdo.',
  biografia:
    'Sol em Escorpião, Ascendente em Câncer e Lua em Touro: combina profundidade, sensibilidade e estabilidade. Apaixonada por autoconhecimento, usa a astrologia como ferramenta de acolhimento e clareza emocional.',
  citacao:
    '“Astrologia é uma linguagem; se você entender essa linguagem, o céu fala com você.”',
  contato: {
    telefone: '+55 (11) 99999-9999',
    whatsapp: 'https://wa.me/5511999999999',
    email: 'contato@astrolumen.com',
    endereco: 'Atendimento online para todo o Brasil'
  },
  redesSociais: {
    instagram: 'https://instagram.com/astrologacamila',
    youtube: 'https://youtube.com/@astrologacamila',
    tiktok: 'https://tiktok.com/@astrologacamila'
  },
  beneficios: [
    'Autoconhecimento e compreensão de padrões emocionais.',
    'Regulação emocional e desenvolvimento de autoestima.',
    'Ressignificação de crenças e desbloqueio de potenciais.',
    'Clareza sobre missão de vida e propósito.',
    'Identificação de oportunidades e ciclos favoráveis.'
  ],
  faq: [
    {
      pergunta: 'O que é mapa astral?',
      resposta:
        'É um retrato simbólico do céu no momento do nascimento, mostrando potenciais, desafios e tendências pessoais.'
    },
    {
      pergunta: 'Como a astrologia pode ajudar?',
      resposta:
        'Ela amplia o autoconhecimento, ajuda na tomada de decisões e oferece uma linguagem para compreender emoções e ciclos.'
    },
    {
      pergunta: 'Qual a diferença entre horóscopo e mapa astral?',
      resposta:
        'O horóscopo usa apenas o signo solar; o mapa astral é único e considera hora, local e aspectos planetários.'
    },
    {
      pergunta: 'Preciso saber meu horário de nascimento?',
      resposta:
        'Sim. O horário define o Ascendente e as casas astrológicas, essenciais para uma leitura precisa.'
    }
  ]
});

module.exports = {
  profile
};
