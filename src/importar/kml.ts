/**
 * Lee un KML y devuelve un lote por cada polígono. Usa el DOMParser del
 * navegador, así que anda sin conexión.
 */

import type { PuntoLatLng } from '../tipos'
import { hectareas } from '../lib/geo'
import type { LoteImportado } from './geojson'

/** `getElementsByTagNameNS('*', ...)` para tolerar KML con o sin prefijo. */
function els(root: Element | Document, nombre: string): Element[] {
  return Array.from(root.getElementsByTagNameNS('*', nombre))
}

function texto(el: Element | undefined, nombre: string): string {
  const hijo = el ? els(el, nombre)[0] : undefined
  return hijo?.textContent?.trim() ?? ''
}

/** Texto de <coordinates> ("lng,lat,alt lng,lat,alt …") -> [lat,lng][]. */
function parseCoords(crudo: string): PuntoLatLng[] {
  const pts: PuntoLatLng[] = []
  for (const token of crudo.trim().split(/\s+/)) {
    const partes = token.split(',')
    if (partes.length < 2) continue
    const lng = parseFloat(partes[0])
    const lat = parseFloat(partes[1])
    if (Number.isFinite(lat) && Number.isFinite(lng)) pts.push([lat, lng])
  }
  if (pts.length > 1) {
    const a = pts[0]
    const b = pts[pts.length - 1]
    if (a[0] === b[0] && a[1] === b[1]) pts.pop()
  }
  return pts
}

export function desdeKML(contenido: string): LoteImportado[] {
  const doc = new DOMParser().parseFromString(contenido, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('El archivo KML está dañado o no se pudo leer.')
  }

  const placemarks = els(doc, 'Placemark')
  const out: LoteImportado[] = []
  let i = 0

  for (const pm of placemarks) {
    const nombreBase = texto(pm, 'name') || `Lote ${i + 1}`
    const poligonos = els(pm, 'Polygon')
    for (const poly of poligonos) {
      const outer = els(poly, 'outerBoundaryIs')[0]
      const coords = texto(outer ?? poly, 'coordinates')
      if (!coords) continue
      const puntos = parseCoords(coords)
      if (puntos.length >= 3) {
        out.push({
          nombre: poligonos.length > 1 ? `${nombreBase} ${i + 1}` : nombreBase,
          puntos,
          ha: hectareas(puntos),
        })
        i++
      }
    }
  }
  return out
}
