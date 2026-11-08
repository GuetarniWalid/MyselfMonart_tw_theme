/*
 * Sert le prototype en local, comme l'hébergeur des Artifacts : `npm start`, puis
 * http://127.0.0.1:8080/ (la maquette du 08/11) ou http://127.0.0.1:8080/index.html (le prototype).
 * Une page HTML reçoit le même squelette que sur claude.ai (doctype, charset, viewport, petit reset).
 */

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.argv[2] || 8080)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.json': 'application/json',
}
const SKELETON = [
  '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">',
  '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}',
  'html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}',
  'img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>',
].join('')

http.createServer((request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost')
  const file = path.join(ROOT, pathname === '/' ? 'maquette.html' : decodeURIComponent(pathname))
  if (!file.startsWith(ROOT + path.sep)) {
    response.writeHead(403).end()
    return
  }
  fs.readFile(file, (error, body) => {
    if (error) {
      response.writeHead(404).end('absent')
      return
    }
    const html = path.extname(file) === '.html'
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })
    response.end(html ? `${SKELETON}\n${body}\n</body></html>` : body)
  })
}).listen(PORT, '127.0.0.1', () => console.log(`Maquette : http://127.0.0.1:${PORT}/`))
