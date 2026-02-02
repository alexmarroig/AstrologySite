const content = require('../../../data/astrolumen_content_v1.json');

const services = content.services || [];
const services = [
  {
    slug: 'natal-chart',
    nome: 'Mapa Astral',
    preco: 197,
    prazo_entrega: '3–5 dias úteis',
    resumo: 'Leitura profunda da personalidade, padrões emocionais e potenciais.',
    descricao:
      'O mapa astral é uma ferramenta de autoconhecimento que analisa a posição dos planetas, signos e casas no momento do nascimento, revelando padrões emocionais, potenciais, desafios e formas conscientes de viver sua própria história.',
    para_quem_e: [
      'Quem busca autoconhecimento',
      'Quem vive momentos de transição',
      'Quem deseja compreender padrões emocionais'
    ],
    inclui: [
      '10 planetas',
      '12 casas astrológicas',
      'Aspectos planetários',
      'Nodos lunares',
      'Relatório profissional em WORD',
      'Revisão humana pela Camila'
    ],
    como_funciona: [
      'Você preenche seus dados de nascimento',
      'O sistema gera a base técnica',
      'Camila analisa e revisa pessoalmente',
      'Você recebe o relatório final por e-mail'
    ],
    beneficios: ['Autoconhecimento profundo', 'Clareza emocional', 'Consciência de ciclos e escolhas'],
    faq: [
      {
        q: 'Mapa astral é previsão?',
        a: 'Não. O mapa astral descreve padrões e potenciais, não determina acontecimentos.'
      }
    ],
    cta_label: 'Gerar meu mapa astral',
    imagem: '/images/servicos/mapa-astral.png',
    tags: ['autoconhecimento', 'identidade', 'emocional']
  },
  {
    slug: 'solar-return',
    nome: 'Revolução Solar',
    preco: 167,
    prazo_entrega: '3–5 dias úteis',
    resumo: 'Leitura do seu novo ciclo anual com foco em oportunidades e desafios.',
    descricao:
      'A revolução solar mostra o clima do ano astrológico, destacando casas ativadas, planetas dominantes e aspectos mais relevantes para decisões conscientes.',
    para_quem_e: [
      'Quem quer planejar o próximo ano',
      'Quem busca direcionamento profissional',
      'Quem deseja clareza emocional'
    ],
    inclui: [
      'Planetas nas casas da revolução',
      'Aspectos dominantes do ano',
      'Períodos críticos e favoráveis',
      'Relatório profissional em WORD',
      'Revisão humana pela Camila'
    ],
    como_funciona: [
      'Você envia seus dados de nascimento',
      'Calculamos o retorno solar com precisão',
      'Camila interpreta os temas do ano',
      'Você recebe o relatório por e-mail'
    ],
    beneficios: ['Direcionamento anual', 'Planejamento estratégico', 'Autocuidado consciente'],
    faq: [
      {
        q: 'A revolução solar substitui o mapa natal?',
        a: 'Não. Ela complementa o mapa natal trazendo a leitura do ciclo anual.'
      }
    ],
    cta_label: 'Quero meu ano astrológico',
    imagem: '/images/servicos/revolucao-solar.png',
    tags: ['ciclos', 'planejamento', 'previsoes']
  },
  {
    slug: 'synastry',
    nome: 'Sinastria',
    preco: 247,
    prazo_entrega: '3–5 dias úteis',
    resumo: 'Comparação de mapas para compreender vínculos e compatibilidades.',
    descricao:
      'A sinastria compara dois mapas astrais para entender dinâmicas de relacionamento, comunicação, desejos e desafios, oferecendo insights para relações mais conscientes.',
    para_quem_e: [
      'Casais que desejam aprofundar o vínculo',
      'Relacionamentos em fase de decisão',
      'Parcerias profissionais ou familiares'
    ],
    inclui: [
      'Análise de Sol, Lua, Vênus e Marte',
      'Aspectos entre mapas',
      'Casas ativadas pela outra pessoa',
      'Relatório profissional em WORD',
      'Revisão humana pela Camila'
    ],
    como_funciona: [
      'Você envia os dados das duas pessoas',
      'Geramos a comparação técnica',
      'Camila interpreta os pontos-chave',
      'Você recebe o relatório por e-mail'
    ],
    beneficios: ['Compreensão emocional', 'Comunicação consciente', 'Fortalecimento de vínculos'],
    faq: [
      {
        q: 'A sinastria diz se um relacionamento vai durar?',
        a: 'Não. Ela mostra dinâmicas e aprendizados possíveis entre duas pessoas.'
      }
    ],
    cta_label: 'Quero entender minha relação',
    imagem: '/images/servicos/sinastria.png',
    tags: ['relacionamentos', 'amor', 'parcerias']
  },
  {
    slug: 'predictions',
    nome: 'Previsões por Trânsitos',
    preco: 227,
    prazo_entrega: '3–5 dias úteis',
    resumo: 'Leitura de trânsitos e oportunidades para decisões conscientes.',
    descricao:
      'A análise de trânsitos revela ciclos ativos, momentos de virada e oportunidades de crescimento, ajudando a planejar decisões com consciência.',
    para_quem_e: [
      'Quem quer se preparar para mudanças',
      'Quem busca timing para projetos',
      'Quem deseja entender ciclos atuais'
    ],
    inclui: [
      'Trânsitos principais do período',
      'Alertas de períodos críticos',
      'Orientações práticas',
      'Relatório profissional em WORD',
      'Revisão humana pela Camila'
    ],
    como_funciona: [
      'Você envia seus dados de nascimento',
      'Mapeamos os trânsitos mais importantes',
      'Camila interpreta as tendências',
      'Você recebe o relatório por e-mail'
    ],
    beneficios: ['Planejamento estratégico', 'Clareza de ciclos', 'Decisões mais conscientes'],
    faq: [
      {
        q: 'As previsões determinam o futuro?',
        a: 'Não. Elas mostram tendências e períodos para escolhas mais conscientes.'
      }
    ],
    cta_label: 'Quero minhas previsões',
    imagem: '/images/servicos/previsoes.png',
    tags: ['transitos', 'planejamento', 'ciclos']
  },
  {
    slug: 'progressions',
    nome: 'Progressões Secundárias',
    preco: 227,
    prazo_entrega: '3–5 dias úteis',
    resumo: 'Análise de maturação emocional e fases internas de vida.',
    descricao:
      'As progressões secundárias revelam processos internos de amadurecimento, fases emocionais e mudanças de perspectiva ao longo do tempo.',
    para_quem_e: [
      'Quem deseja entender mudanças internas',
      'Quem está em fase de transição',
      'Quem busca clareza sobre maturação emocional'
    ],
    inclui: [
      'Progressão de Sol, Lua e planetas pessoais',
      'Fases emocionais marcantes',
      'Orientações para decisões conscientes',
      'Relatório profissional em WORD',
      'Revisão humana pela Camila'
    ],
    como_funciona: [
      'Você informa seus dados de nascimento',
      'Calculamos as progressões do período',
      'Camila interpreta os temas centrais',
      'Você recebe o relatório por e-mail'
    ],
    beneficios: ['Clareza emocional', 'Direcionamento interno', 'Autoconhecimento em fases'],
    faq: [
      {
        q: 'Progressões são previsões?',
        a: 'Não. Elas mostram processos internos e ciclos de amadurecimento.'
      }
    ],
    cta_label: 'Quero minhas progressões',
    imagem: '/images/servicos/progressoes.png',
    tags: ['maturacao', 'ciclos', 'emocional']
  }
];

const findServiceBySlug = (slug) => services.find((service) => service.slug === slug);

module.exports = {
  services,
  findServiceBySlug
};
