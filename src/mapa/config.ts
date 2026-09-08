/** Configuración del mapa: proveedor de imágenes y encuadre inicial. */

/** Imagen satelital de Esri (misma que el prototipo). */
export const TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

export const TILE_ATTR = 'Imágenes Esri'

export const TILE_HOST = 'server.arcgisonline.com'

export const TILE_MAX_ZOOM = 19

/** Baradero, Buenos Aires. */
export const CENTRO_INICIAL: [number, number] = [-33.8095, -59.5069]
export const ZOOM_INICIAL = 12

/** Construye la URL de un tile concreto. */
export function urlTile(z: number, x: number, y: number): string {
  return TILE_URL.replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
}
