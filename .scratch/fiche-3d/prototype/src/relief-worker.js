// Calcule les reliefs hors du fil de la page : la trame d'abord, le papier ensuite.
import { paperPixels, weavePixels } from './textures.js'

function send(name, pixels) {
  postMessage({ name, pixels }, [pixels.buffer])
}

send('weave', weavePixels())
send('paper', paperPixels())
