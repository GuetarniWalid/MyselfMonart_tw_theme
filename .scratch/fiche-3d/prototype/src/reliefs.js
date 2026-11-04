/*
 * Reliefs (trame de la toile, grain du papier) : calculés dans un worker, en parallèle du
 * chargement de three.js. Sans worker, la trame est calculée ici et le papier attend que
 * la page soit posée. Renvoie deux promesses de pixels : { weave, paper }.
 */

const SILENT_WORKER_MS = 3000 // un worker muet ne doit pas priver de 3D
const PAPER_DELAY_MS = 1500

export function startReliefs() {
  const done = {}
  const reliefs = {
    weave: new Promise((resolve) => { done.weave = resolve }),
    paper: new Promise((resolve) => { done.paper = resolve }),
  }
  let inPageStarted = false
  const inPage = async () => {
    if (inPageStarted) return
    inPageStarted = true
    const { paperPixels, weavePixels } = await import('./textures.js')
    done.weave(weavePixels())
    setTimeout(() => done.paper(paperPixels()), PAPER_DELAY_MS)
  }
  try {
    const worker = new Worker(new URL('./relief-worker.js', import.meta.url), { type: 'module' })
    const silent = setTimeout(inPage, SILENT_WORKER_MS)
    worker.onmessage = ({ data }) => {
      clearTimeout(silent)
      done[data.name](data.pixels)
      if (data.name === 'paper') worker.terminate()
    }
    worker.onerror = () => {
      clearTimeout(silent)
      inPage()
    }
  } catch {
    inPage()
  }
  return reliefs
}
