/**
 * Procesa una imagen subida desde el formulario (foto o archivo): recorta los
 * márgenes negros parejos (las capturas del joystick suelen mostrar el mapa
 * en un recuadro chico sobre fondo negro propio de la app), la redimensiona
 * si hace falta y la comprime como JPEG. Todo con el canvas del navegador,
 * sin librerías.
 */

import type { ImagenAdjunta } from '../tipos'

const ANCHO_MAXIMO = 1600
const CALIDAD_JPEG = 0.8

/** Un canal (r/g/b) por debajo de esto cuenta como "negro". */
const UMBRAL_NEGRO = 14

function filaEsNegra(datos: Uint8ClampedArray, ancho: number, y: number): boolean {
  const inicio = y * ancho * 4
  for (let x = 0; x < ancho; x++) {
    const i = inicio + x * 4
    if (datos[i] > UMBRAL_NEGRO || datos[i + 1] > UMBRAL_NEGRO || datos[i + 2] > UMBRAL_NEGRO) {
      return false
    }
  }
  return true
}

function columnaEsNegra(
  datos: Uint8ClampedArray,
  ancho: number,
  alto: number,
  x: number,
): boolean {
  for (let y = 0; y < alto; y++) {
    const i = (y * ancho + x) * 4
    if (datos[i] > UMBRAL_NEGRO || datos[i + 1] > UMBRAL_NEGRO || datos[i + 2] > UMBRAL_NEGRO) {
      return false
    }
  }
  return true
}

/**
 * Si el canvas tiene franjas negras parejas en algún borde (de punta a
 * punta), devuelve uno nuevo recortado a donde empieza contenido real. Si no
 * hay nada para recortar, devuelve el mismo canvas.
 */
function recortarMargenesNegros(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const ancho = canvas.width
  const alto = canvas.height
  const { data } = ctx.getImageData(0, 0, ancho, alto)

  let arriba = 0
  let abajo = alto - 1
  let izq = 0
  let der = ancho - 1
  while (arriba < abajo && filaEsNegra(data, ancho, arriba)) arriba++
  while (abajo > arriba && filaEsNegra(data, ancho, abajo)) abajo--
  while (izq < der && columnaEsNegra(data, ancho, alto, izq)) izq++
  while (der > izq && columnaEsNegra(data, ancho, alto, der)) der--

  const w = der - izq + 1
  const h = abajo - arriba + 1
  if (w === ancho && h === alto) return canvas

  const recortado = document.createElement('canvas')
  recortado.width = w
  recortado.height = h
  recortado.getContext('2d')?.drawImage(canvas, izq, arriba, w, h, 0, 0, w, h)
  return recortado
}

export function procesarImagen(file: File): Promise<ImagenAdjunta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)

      // 1) Volcar la imagen tal cual, a tamaño completo, para poder analizarla.
      const original = document.createElement('canvas')
      original.width = img.naturalWidth
      original.height = img.naturalHeight
      const ctxOriginal = original.getContext('2d')
      if (!ctxOriginal) {
        reject(new Error('No se pudo procesar la imagen.'))
        return
      }
      ctxOriginal.drawImage(img, 0, 0)

      // 2) Recortar los márgenes negros parejos, si los hay.
      const recortado = recortarMargenesNegros(original)

      // 3) Redimensionar (si hace falta) y comprimir a JPEG, con fondo
      // blanco por si el original tenía transparencia (PNG con bordes
      // redondeados, recuadros de la interfaz) — JPEG no la soporta, y el
      // navegador la rellena de negro si no se hace antes.
      const escala = Math.min(1, ANCHO_MAXIMO / recortado.width)
      const ancho = Math.round(recortado.width * escala)
      const alto = Math.round(recortado.height * escala)

      const final = document.createElement('canvas')
      final.width = ancho
      final.height = alto
      const ctxFinal = final.getContext('2d')
      if (!ctxFinal) {
        reject(new Error('No se pudo procesar la imagen.'))
        return
      }
      ctxFinal.fillStyle = '#ffffff'
      ctxFinal.fillRect(0, 0, ancho, alto)
      ctxFinal.drawImage(recortado, 0, 0, ancho, alto)
      resolve({ src: final.toDataURL('image/jpeg', CALIDAD_JPEG), ancho, alto })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }

    img.src = url
  })
}
