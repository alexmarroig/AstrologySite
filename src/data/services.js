const { createService } = require('../models/service');

const services = [
  createService({
    slug: 'mapa-natal',
    nome: 'Mapa Natal Completo',
    resumo: 'Leitura profunda da sua essência, potencialidades e desafios de vida.',
    preco: 189,
    imagem: 'https://cdn.astrolumen.com/services/mapa-natal.jpg',
    descricaoCompleta: {
      texto:
        'Um mergulho detalhado no seu mapa astral, combinando signos, casas e aspectos para revelar padrões emocionais, talentos e caminhos de crescimento. A análise segue a abordagem da astrologia psicológica, incluindo interpretação de planetas, casas e aspectos principais.',
      itens: [
        'Planetas nos signos com foco em personalidade, vocações e necessidades emocionais.',
        'Planetas nas casas com leitura de áreas de vida em destaque.',
        'Aspectos principais e dinâmicas entre Sol, Lua, Ascendente e regente do mapa.',
        'Resumo de potenciais e desafios com orientações práticas.',
        'Entrega digital em PDF com linguagem acessível.'
      ]
    },
    linksArtigos: [
      {
        id: 1,
        titulo: 'O que é mapa astral e como interpretar?',
        slug: 'o-que-e-mapa-astral'
      },
      {
        id: 2,
        titulo: 'Como Sol, Lua e Ascendente moldam sua identidade',
        slug: 'sol-lua-ascendente-identidade'
      }
    ]
  }),
  createService({
    slug: 'revolucao-solar',
    nome: 'Revolução Solar',
    resumo: 'Previsões e direcionamentos para o seu novo ciclo anual.',
    preco: 159,
    imagem: 'https://cdn.astrolumen.com/services/revolucao-solar.jpg',
    descricaoCompleta: {
      texto:
        'A Revolução Solar revela o clima do seu novo ano astrológico, mostrando temas centrais, oportunidades e desafios. A leitura combina trânsitos, casas ativadas e aspectos dominantes para orientar escolhas e estratégias.',
      itens: [
        'Planetas nas casas da revolução com ênfase em áreas prioritárias.',
        'Aspectos dominantes do ano e tendências emocionais.',
        'Trânsitos mais relevantes para crescimento pessoal e profissional.',
        'Orientações práticas para metas e autocuidado.',
        'Entrega digital em PDF com cronograma de períodos favoráveis.'
      ]
    },
    linksArtigos: [
      {
        id: 3,
        titulo: 'Como funciona a Revolução Solar?',
        slug: 'como-funciona-revolucao-solar'
      }
    ]
  }),
  createService({
    slug: 'sinastria',
    nome: 'Sinastria Amorosa',
    resumo: 'Análise da compatibilidade e dos aprendizados entre duas pessoas.',
    preco: 219,
    imagem: 'https://cdn.astrolumen.com/services/sinastria.jpg',
    descricaoCompleta: {
      texto:
        'A sinastria compara dois mapas para identificar afinidades, desafios e padrões de relacionamento. A leitura destaca a dinâmica emocional, comunicação e sexualidade, com sugestões para fortalecer o vínculo.',
      itens: [
        'Comparação de Sol, Lua, Vênus e Marte para entender desejos e afetos.',
        'Aspectos entre mapas que indicam pontos de harmonia e tensão.',
        'Leitura das casas ativadas pelo outro e impacto nos projetos de vida.',
        'Insights sobre comunicação e linguagem do amor.',
        'Entrega digital em PDF com recomendações práticas.'
      ]
    },
    linksArtigos: [
      {
        id: 4,
        titulo: 'O que a sinastria revela sobre seus relacionamentos',
        slug: 'sinastria-relacionamentos'
      }
    ]
  }),
  createService({
    slug: 'previsoes-anuais',
    nome: 'Previsões e Trânsitos',
    resumo: 'Mapa de tendências para decisões conscientes ao longo do ano.',
    preco: 169,
    imagem: 'https://cdn.astrolumen.com/services/previsoes.jpg',
    descricaoCompleta: {
      texto:
        'Leitura personalizada dos principais trânsitos e aspectos para os próximos 12 meses, com foco em crescimento pessoal, carreira e relacionamentos. A análise prioriza ciclos de Saturno, Júpiter e eclipses.',
      itens: [
        'Principais trânsitos planetários que ativam seu mapa natal.',
        'Pontos de virada e períodos de maior intensidade emocional.',
        'Orientações para aproveitar janelas de oportunidade.',
        'Sugestões de rituais e práticas de autocuidado.',
        'Entrega digital em PDF com calendário resumido.'
      ]
    },
    linksArtigos: [
      {
        id: 5,
        titulo: 'Entenda os trânsitos astrológicos mais importantes',
        slug: 'entenda-transitos-astrologicos'
      }
    ]
  })
];

const findServiceBySlug = (slug) => services.find((service) => service.slug === slug);

module.exports = {
  services,
  findServiceBySlug
};
