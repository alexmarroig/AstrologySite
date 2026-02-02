const content = require('../../../data/astrolumen_content_v1.json');

const profile = content.profile;
const whatsappNumber = process.env.WHATSAPP_NUMBER || '55SEUNUMEROAQUI';

const profile = {
  nome: 'Camila Veloso',
  titulo: 'Astróloga Profissional',
  foto: '/images/camila.png',
  formacao: 'Formada em Astrologia pela Escola GAIA',
  inicio_estudos: 2019,
  experiencia: '10+ anos',
  abordagem: 'Astrologia psicológica, simbólica e aplicada à vida real',
  biografia_curta:
    'Astróloga dedicada ao autoconhecimento profundo por meio da linguagem simbólica dos astros.',
  biografia_longa:
    'Camila Veloso atua com astrologia como ferramenta de consciência, leitura de padrões emocionais e compreensão de ciclos de vida. Seu trabalho não é determinista nem fatalista, mas orientado à responsabilidade pessoal e ao uso consciente da informação astrológica.',
  missao:
    'Ajudar pessoas a compreenderem sua história, seus padrões emocionais e seus ciclos de vida por meio da astrologia.',
  citacao: {
    autor: 'Dane Rudhyar',
    texto: 'Astrologia é uma linguagem. Se você entender essa linguagem, o céu fala com você.'
  },
  especialidades: [
    'Mapa Astral',
    'Revolução Solar',
    'Sinastria',
    'Previsões por Trânsitos',
    'Progressões'
  ],
  beneficios: [
    'Autoconhecimento',
    'Regulação emocional',
    'Ressignificação de crenças',
    'Consciência de missão de vida',
    'Identificação de potenciais'
  ],
  contato: {
    whatsapp: `https://wa.me/${whatsappNumber}`,
    email: 'astrologacamila@gmail.com',
    instagram: 'https://instagram.com/astrologacamila'
  }
};

module.exports = {
  profile
};
