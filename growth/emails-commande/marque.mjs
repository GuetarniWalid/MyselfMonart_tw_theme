// Ce qui identifie la marque dans les mails : la police du site et le logo.

// La police du thème en ligne. Si le thème change de numéro, les mails passent aux polices de
// remplacement sans rien casser : il suffira de mettre cette adresse à jour.
export const FONT_URL = 'https://www.myselfmonart.com/cdn/shop/t/25/assets/heading.woff2'

// Fabriqués par logo.mjs, à déposer dans Shopify > Contenu > Fichiers.
const FILES = 'https://cdn.shopify.com/s/files/1/0623/2388/4287/files'
export const LOGO_LIGHT = `${FILES}/mail-logo-clair.png`
export const LOGO_DARK = `${FILES}/mail-logo-sombre.png`
export const LOGO_WIDTH = 230
export const LOGO_HEIGHT = 37
