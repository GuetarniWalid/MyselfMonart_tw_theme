// Les schémas des sections, tels que Shopify les accepte. Un schéma refusé bloque ce fichier au déploiement
// (« status: partial ») : le 20/11/2026, le texte d'aide de sections/galerie-scene.liquid faisait 561 caractères,
// et Shopify n'en accepte que 500 pour un réglage « paragraph ».
// Lancer : node --test scripts/sections-schema.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SECTIONS = path.join(ROOT, 'sections')
const schemas = fs.readdirSync(SECTIONS)
  .filter((name) => name.endsWith('.liquid'))
  .map((name) => [name, /{% schema %}([\s\S]*?){% endschema %}/.exec(fs.readFileSync(path.join(SECTIONS, name), 'utf8'))])
  .filter(([, match]) => match)
  .map(([name, match]) => [name, JSON.parse(match[1])])

test('chaque schéma de section se lit', () => {
  assert.ok(schemas.length > 10)
})

test('le texte d’un réglage « paragraph » ou « header » tient en 500 caractères', () => {
  for (const [name, schema] of schemas) {
    const settings = [...(schema.settings || []), ...(schema.blocks || []).flatMap((block) => block.settings || [])]
    for (const setting of settings) {
      if (setting.type !== 'paragraph' && setting.type !== 'header') continue
      const content = setting.content || ''
      assert.ok(content.length <= 500, `${name} : un réglage « ${setting.type} » de ${content.length} caractères`)
    }
  }
})
