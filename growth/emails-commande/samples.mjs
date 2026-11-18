// Données d'exemple pour les aperçus : de vraies œuvres de la boutique, un client fictif.

const CDN = 'https://cdn.shopify.com/s/files/1/0623/2388/4287/files/'

const japon = {
  title: "Tableau Paysage japonais - Calme lunaire à l'encre",
  presentment_title: "Tableau Paysage japonais - Calme lunaire à l'encre",
  product: { title: "Tableau Paysage japonais - Calme lunaire à l'encre" },
  variant: { title: '60x80 cm / Bordure blanche / Cadre chêne clair' },
  image: `${CDN}tableau-paysage-japonais-lune-arbre-encre.jpg`,
  quantity: 1,
  final_line_price: 15900,
  discount_allocations: [],
  properties: [],
}

const danseuse = {
  title: 'Toile décorative Danseuse africaine - Aura sacrée',
  presentment_title: 'Toile décorative Danseuse africaine - Aura sacrée',
  product: { title: 'Toile décorative Danseuse africaine - Aura sacrée' },
  variant: { title: '40x60 cm / Bordure blanche / Sans cadre' },
  image: `${CDN}tableau-danseuse-africaine-aura-sacree-indigo-or.jpg`,
  quantity: 1,
  final_line_price: 9800,
  discount_allocations: [],
  properties: [],
}

const poster = {
  title: "Poster Danseuse africaine - Mouvement sacré aux couleurs de l'Afrique",
  presentment_title: "Poster Danseuse africaine - Mouvement sacré aux couleurs de l'Afrique",
  product: { title: "Poster Danseuse africaine - Mouvement sacré aux couleurs de l'Afrique" },
  variant: { title: '60x80 cm / Avec cadre' },
  image: `${CDN}poster-danseuse-africaine-mouvement-sacr-aux-couleurs-de-l-afrique-0-1a5f6ddf-03ef-4063-acf9-ddee51385ef5.jpg`,
  quantity: 2,
  final_line_price: 18980,
  discount_allocations: [
    { amount: 1000, discount_application: { target_selection: 'explicit', title: 'BIENVENUE10' } },
  ],
  properties: [['Couleur du cadre', 'Chêne clair'], ['_interne', 'à ne pas montrer']],
}

// Nouveaux produits (Publisher, modèle de page oeuvre-3d) : l'œuvre à plat est leur 1re image ; la
// ligne a la photo studio de sa variante, fichier « photo-studio-… », que le mail ne doit jamais
// montrer (ces adresses n'existent pas : une image cassée sur une capture le dirait). Le Bonsaï de
// la boutique, ses vrais formats et propriétés de ligne.
const BONSAI_TOILE = `${CDN}tableau-zen-bonsai-japonais-fond-beige-abstrait-nature-minimaliste-7a68cc68-ec22-485b-9fda-2e0186e5f4f9.png`
const BONSAI_POSTER = `${CDN}poster-bonsa-zen-patience-v-g-tale-et-harmonie-silencieuse-32ab2340-2d34-4e44-9b8b-10abe7fe0adc.png`
const studio = (name) => `${CDN}photo-studio-${name}.jpg`
const TOILE_BONSAI = 'Tableau sur toile Bonsaï zen - Sérénité végétale et équilibre apaisant'
const POSTER_BONSAI = 'Poster Bonsaï zen - Patience végétale et harmonie silencieuse'

const nouvelle = (title, featured, extra) => ({
  title,
  presentment_title: title,
  product: { title, template_suffix: 'oeuvre-3d', featured_image: featured },
  quantity: 1,
  discount_allocations: [],
  properties: [],
  ...extra,
})

export const toileChene = nouvelle(TOILE_BONSAI, BONSAI_TOILE, {
  variant: { title: '60x80 cm / Bordure blanche / Cadre chêne clair' },
  image: studio('tableau-bonsai-zen-cadre-chene-clair'),
  final_line_price: 15900,
})

export const posterBlancContour = nouvelle(POSTER_BONSAI, BONSAI_POSTER, {
  variant: { title: '60x80 cm / Avec cadre' },
  image: studio('poster-bonsai-zen-cadre-blanc'),
  final_line_price: 9490,
  properties: [
    ['Couleur du cadre', 'Blanc'],
    ['_cadre', 'cadre-blanc-1'],
    ['Contour blanc', 'Avec contour blanc'],
    ['_passe_partout', 'oui'],
  ],
})

export const posterSansCadre = nouvelle(POSTER_BONSAI, BONSAI_POSTER, {
  variant: { title: '30x40 cm / Sans cadre' },
  image: studio('poster-bonsai-zen-sans-cadre'),
  final_line_price: 2490,
  properties: [
    ['Contour blanc', 'Sans contour blanc'],
    ['_passe_partout', 'non'],
  ],
})

const kit = {
  title: "KIT D'ACCROCHAGE – Simple et Polyvalent",
  product: { title: "KIT D'ACCROCHAGE – Simple et Polyvalent" },
  variant: { title: 'Default Title' },
  image: null,
  quantity: 1,
  final_line_price: 600,
  discount_allocations: [],
  properties: [],
}

const base = {
  shop: { url: 'https://www.myselfmonart.com', email: 'team@myselfmonart.com', name: 'MyselfMonArt' },
  customer: { first_name: 'Camille' },
  order_name: '#1880',
  name: '#1880',
  order_status_url: 'https://www.myselfmonart.com/orders/exemple',
  requires_shipping: true,
  item_count: 1,
}

const address = {
  lines: ['Camille Martin', '12 rue des Lilas', '31000 Toulouse', 'France'],
}

export const fulfillment = (lines, tracking = {}) => ({
  item_count: lines.reduce((total, line) => total + line.quantity, 0),
  fulfillment_line_items: lines.map((line) => ({ line_item: line, quantity: line.quantity })),
  tracking_numbers: [],
  tracking_urls: [],
  tracking_company: null,
  tracking_url: null,
  estimated_delivery_at: null,
  ...tracking,
})

const ups = {
  tracking_numbers: ['1Z698W756806817075'],
  tracking_urls: ['https://www.ups.com/track?tracknum=1Z698W756806817075'],
  tracking_url: 'https://www.ups.com/track?tracknum=1Z698W756806817075',
  tracking_company: 'UPS',
}

const maersk = {
  tracking_numbers: ['1MX1234AB0073309585'],
  tracking_urls: ['https://www.maersk.com/tracking/parcel/1MX1234AB0073309585'],
  tracking_url: 'https://www.maersk.com/tracking/parcel/1MX1234AB0073309585',
  tracking_company: 'Maersk',
}

const order = (lines, extra = {}) => ({
  ...base,
  item_count: lines.reduce((total, line) => total + line.quantity, 0),
  subtotal_line_items: lines,
  line_items: lines,
  subtotal_price: lines.reduce((total, line) => total + line.final_line_price, 0),
  shipping_price: 0,
  tax_price: 0,
  total_price: lines.reduce((total, line) => total + line.final_line_price, 0),
  discount_applications: [],
  transactions: [
    {
      status: 'success',
      kind: 'sale',
      amount: 15900,
      gateway_display_name: 'PayPal',
      payment_details: {},
    },
  ],
  shipping_address: address,
  billing_address: address,
  shipping_method: { title: 'Livraison standard offerte' },
  ...extra,
})

// Un cas = un modèle, une langue, des données.
export const CASES = [
  { id: 'confirmation', template: 'order_confirmation', data: order([japon]) },
  { id: 'fabrication', template: 'shipping_confirmation', data: { ...base, fulfillment: fulfillment([japon]) } },
  { id: 'terminee', template: 'shipping_update', data: { ...base, fulfillment: fulfillment([japon], ups) } },
  { id: 'arrive', template: 'shipment_out_for_delivery', data: { ...base, fulfillment: fulfillment([japon], ups) } },
  { id: 'arrivee', template: 'shipment_delivered', data: { ...base, fulfillment: fulfillment([japon], ups) } },

  // Cas limites : plusieurs œuvres, kit, remises, prénom absent, autres transporteurs.
  {
    id: 'confirmation-plusieurs',
    template: 'order_confirmation',
    data: order([danseuse, poster, kit], {
      customer: { first_name: '' },
      discount_applications: [
        { target_selection: 'all', title: 'ETE15', total_allocated_amount: 1500 },
      ],
      tax_price: 4800,
      shipping_price: 690,
      total_price: 28770,
      consolidated_estimated_delivery_time: '12 novembre',
    }),
  },
  {
    id: 'fabrication-plusieurs',
    template: 'shipping_confirmation',
    data: { ...base, item_count: 4, fulfillment: fulfillment([danseuse, poster, kit]) },
  },
  {
    id: 'terminee-maersk',
    template: 'shipping_update',
    data: { ...base, item_count: 4, fulfillment: fulfillment([danseuse, kit], maersk) },
  },
  {
    id: 'terminee-inconnu',
    template: 'shipping_update',
    data: {
      ...base,
      fulfillment: fulfillment([japon], {
        tracking_numbers: ['00340433927603412126', '00340433927603412127'],
        tracking_urls: [],
        tracking_company: 'Other',
      }),
    },
  },
  {
    id: 'fabrication-avec-suivi',
    template: 'shipping_confirmation',
    data: { ...base, fulfillment: fulfillment([japon], ups) },
  },
  {
    id: 'arrivee-plusieurs',
    template: 'shipment_delivered',
    data: { ...base, item_count: 4, fulfillment: fulfillment([danseuse, poster, kit], ups) },
  },
  {
    id: 'confirmation-allemand',
    template: 'order_confirmation',
    locale: 'de',
    data: order([poster, kit], { customer: { first_name: 'Dorothee' }, total_price: 19580 }),
  },
  // Nouveaux produits : l'œuvre en objet, avec son cadre et son contour blanc.
  { id: 'nouvelle-toile', template: 'order_confirmation', data: order([toileChene]) },
  { id: 'nouveau-poster-contour', template: 'order_confirmation', data: order([posterBlancContour]) },
  { id: 'nouveau-poster-nu', template: 'order_confirmation', data: order([posterSansCadre]) },
  {
    id: 'nouveau-poster-papier-contour',
    template: 'order_confirmation',
    data: order([{ ...posterSansCadre, properties: [['Contour blanc', 'Avec contour blanc'], ['_passe_partout', 'oui']] }]),
  },
  {
    id: 'nouvelles-deux',
    template: 'order_confirmation',
    data: order([toileChene, posterBlancContour], { total_price: 25390 }),
  },
  {
    id: 'nouvelle-arrivee',
    template: 'shipment_delivered',
    data: { ...base, fulfillment: fulfillment([toileChene], ups) },
  },
  {
    id: 'nouvelles-terminee-allemand',
    template: 'shipping_update',
    locale: 'de',
    data: {
      ...base,
      customer: { first_name: 'Dorothee' },
      item_count: 2,
      fulfillment: fulfillment(
        [
          {
            ...toileChene,
            presentment_title: 'Leinwandbild Zen-Bonsai - Pflanzliche Gelassenheit und beruhigendes Gleichgewicht',
            variant: { title: '60x80 cm / Weißer Rand / Rahmen aus heller Eiche' },
          },
          {
            ...posterBlancContour,
            presentment_title: 'Poster Zen-Bonsai - Pflanzliche Geduld und stille Harmonie',
            variant: { title: '60x80 cm / Mit Rahmen' },
          },
        ],
        {
          tracking_numbers: ['00340433927603412126'],
          tracking_urls: ['https://www.dhl.com/de-de/home/tracking.html?tracking-id=00340433927603412126&submit=1'],
          tracking_url: 'https://www.dhl.com/de-de/home/tracking.html?tracking-id=00340433927603412126&submit=1',
          tracking_company: 'DHL eCommerce',
        }
      ),
    },
  },
  {
    id: 'terminee-allemand',
    template: 'shipping_update',
    locale: 'de',
    data: {
      ...base,
      customer: { first_name: 'Dorothee' },
      fulfillment: fulfillment([poster], {
        tracking_numbers: ['00340433927603412126'],
        tracking_urls: ['https://www.dhl.com/de-de/home/tracking.html?tracking-id=00340433927603412126&submit=1'],
        tracking_url: 'https://www.dhl.com/de-de/home/tracking.html?tracking-id=00340433927603412126&submit=1',
        tracking_company: 'DHL eCommerce',
      }),
    },
  },
]
