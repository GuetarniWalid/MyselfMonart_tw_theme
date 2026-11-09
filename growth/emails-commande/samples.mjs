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
