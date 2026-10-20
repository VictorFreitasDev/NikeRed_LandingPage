import { ProductConfig } from '../types/product';

export const PRODUCT_DATA: ProductConfig = {
  name: 'Nike Air Force 1 Low QS',
  model: 'Air Force 1 Low',
  edition: 'Quickstrike (QS) &ldquo;Team Red&rdquo;',
  sku: 'IR1940-600',
  colorway: 'Team Red / Team Red',
  officialUrl: 'https://www.nike.com.br/snkrs/nike-air-force-1-low-qs-122872.html',
  officialRetailPriceUSD: '$140 USD (Referência internacional de lançamento)',
  features: [
    {
      id: 'texture',
      tag: '01 / MATERIAL',
      title: 'Acabamento Faux Pony Hair',
      description:
        'Uma releitura ousada e tátil da silhueta clássica. O cabedal recebe sobreposição integral em pelo sintético (pony hair) com textura densa, conferindo profundidade sensorial e um brilho sutil a cada ângulo.',
    },
    {
      id: 'color',
      tag: '02 / TONALIDADE',
      title: 'Monocromático Team Red',
      description:
        'Uma única tonalidade bordô profunda envolve cadarços, ilhóses, Swoosh lateral e entressola. Um visual cinematográfico e imponente desenhado para quem valoriza presença sem ruído visual.',
    },
    {
      id: 'cushioning',
      tag: '03 / TECNOLOGIA',
      title: 'Amortecimento Nike Air',
      description:
        'Desenvolvido originalmente para as quadras de basquete em 1982, o amortecimento Nike Air encapsulado no calcanhar garante absorção de impacto contínua e conforto prolongado para o asfalto urbano.',
    },
    {
      id: 'heritage',
      tag: '04 / LEGADO',
      title: 'Solado Pivot Tradicional',
      description:
        'Borracha vulcanizada de alta tração com padrão de círculos concêntricos e pontos de giro originais, assegurando aderência precisa e a lendária durabilidade do AF1.',
    },
  ],
  gallery: [
    {
      id: 'g1',
      title: 'Caminhada Urbana Noturna',
      caption: 'A silhueta em movimento no asfalto molhado, capturando os reflexos de neon da cidade.',
      src: './frames/desktop/frame_001.webp',
      aspectRatio: '16/9',
    },
    {
      id: 'g2',
      title: 'A Pisada & Névoa Bordô',
      caption: 'Fumaça em tom vinho emerge a cada contato com o solo, revelando a energia Team Red.',
      src: './frames/desktop/frame_028.webp',
      aspectRatio: '16/9',
    },
    {
      id: 'g3',
      title: 'Textura Tátil em Close-Up',
      caption: 'A rica superfície em faux pony hair contrastando com os relevos da entressola AIR.',
      src: './frames/desktop/frame_055.webp',
      aspectRatio: '16/9',
    },
  ],
  editorialText: {
    heroTitle: 'Presença em cada passo.',
    heroSubtitle: 'Air Force 1 Low QS Team Red.',
    phase1: 'A noite abre passagem. A silhueta de 1982 reinventada em uma visão visceral de streetwear.',
    phase2: 'O impacto no asfalto. A fumaça bordô emerge, definindo o território e o ritmo da cidade.',
    phase3: 'Textura inconfundível. Faux pony hair profundo em tom Team Red que desafia o ordinário.',
    phase4: 'Nike Air Force 1 Low QS. Monocromático, tátil e inescapável.',
    detailsIntro: 'CRIADO PARA TRANSFORMAR O ASFALTO EM PASSARELA.',
    detailsQuote:
      'Uma expressão de luxo e rua. O clássico definitivo ganha textura viva e atitude monocromática.',
  },
};

