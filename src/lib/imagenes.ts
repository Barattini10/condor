/**
 * Procesa una imagen subida desde el formulario (foto o archivo): la
 * redimensiona si hace falta y la comprime como JPEG, para no llenar la base
 * local con las capturas del joystick (vienen grandes). Todo con el canvas
 * del navegador, sin librerías.
 */

const ANCHO_MAXIMO = 1600
const CALIDAD_JPEG = 0.8

export function procesarImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const escala = Math.min(1, ANCHO_MAXIMO / img.naturalWidth)
      const ancho = Math.round(img.naturalWidth * escala)
      const alto = Math.round(img.naturalHeight * escala)

      const canvas = document.createElement('canvas')
      canvas.width = ancho
      canvas.height = alto
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)

      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen.'))
        return
      }
      // JPEG no tiene transparencia: si no se rellena antes, el navegador
      // convierte lo transparente del original (PNG con bordes redondeados,
      // recuadros de la interfaz) en NEGRO. Blanco combina con la hoja del
      // informe, así no se nota ningún borde.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, ancho, alto)
      ctx.drawImage(img, 0, 0, ancho, alto)
      resolve(canvas.toDataURL('image/jpeg', CALIDAD_JPEG))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }

    img.src = url
  })
}
