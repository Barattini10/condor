/**
 * Procesa una imagen subida desde el formulario (foto o archivo): recorta los
 * márgenes de color parejo (las capturas de la app del dron suelen mostrar
 * el mapa en un recuadro chico rodeado de fondo sólido — negro en algunas
 * pantallas, blanco en otras), la redimensiona si hace falta y la comprime
 * como JPEG. Todo con el canvas del navegador, sin librerías.
 */

import type { ImagenAdjunta } from '../tipos'

const ANCHO_MAXIMO = 1600
const CALIDAD_JPEG = 0.8

/** Diferencia máxima por canal (r/g/b) para considerar "el mismo color" que el borde. */
const UMBRAL_COLOR = 14

/**
 * Fracción de píxeles de una fila/columna que puede NO matchear el color de
 * fondo sin que deje de contarse como "borde". Algunas capturas tienen
 * marquitas sueltas (puntos rojos de GPS, íconos) sobre el fondo; sin esta
 * tolerancia, una sola marca en el borde frena el recorte ahí mismo.
 */
const TOLERANCIA_RUIDO = 0.02

type ColorRGB = [number, number, number]

function colorParecido(datos: Uint8ClampedArray, i: number, color: ColorRGB): boolean {
  return (
    Math.abs(datos[i] - color[0]) <= UMBRAL_COLOR &&
    Math.abs(datos[i + 1] - color[1]) <= UMBRAL_COLOR &&
    Math.abs(datos[i + 2] - color[2]) <= UMBRAL_COLOR
  )
}

function filaEsDelColor(
  datos: Uint8ClampedArray,
  ancho: number,
  y: number,
  color: ColorRGB,
): boolean {
  const inicio = y * ancho * 4
  const limite = ancho * TOLERANCIA_RUIDO
  let malos = 0
  for (let x = 0; x < ancho; x++) {
    if (!colorParecido(datos, inicio + x * 4, color)) {
      malos++
      if (malos > limite) return false
    }
  }
  return true
}

function columnaEsDelColor(
  datos: Uint8ClampedArray,
  ancho: number,
  alto: number,
  x: number,
  color: ColorRGB,
): boolean {
  const limite = alto * TOLERANCIA_RUIDO
  let malos = 0
  for (let y = 0; y < alto; y++) {
    if (!colorParecido(datos, (y * ancho + x) * 4, color)) {
      malos++
      if (malos > limite) return false
    }
  }
  return true
}

/**
 * Si el canvas tiene franjas de un color sólido parejo en algún borde (de
 * punta a punta), devuelve uno nuevo recortado a donde empieza contenido
 * real. El color de referencia se toma de la esquina superior izquierda, así
 * que sirve tanto para fondo negro como blanco (o cualquier otro). Si no hay
 * nada para recortar, devuelve el mismo canvas.
 */
function recortarMargenesUniformes(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const ancho = canvas.width
  const alto = canvas.height
  const { data } = ctx.getImageData(0, 0, ancho, alto)
  const color: ColorRGB = [data[0], data[1], data[2]]

  let arriba = 0
  let abajo = alto - 1
  let izq = 0
  let der = ancho - 1
  while (arriba < abajo && filaEsDelColor(data, ancho, arriba, color)) arriba++
  while (abajo > arriba && filaEsDelColor(data, ancho, abajo, color)) abajo--
  while (izq < der && columnaEsDelColor(data, ancho, alto, izq, color)) izq++
  while (der > izq && columnaEsDelColor(data, ancho, alto, der, color)) der--

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

      // 2) Recortar los márgenes de color sólido parejo, si los hay.
      const recortado = recortarMargenesUniformes(original)

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
