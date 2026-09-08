/**
 * Punto de entrada de la importación: recibe el archivo que eligió el usuario,
 * detecta el formato y devuelve los lotes encontrados.
 *
 *  - .kml            KML de texto
 *  - .kmz            KML comprimido (zip)
 *  - .geojson/.json  GeoJSON
 *  - .zip            shapefile (.shp/.shx/.dbf) — o un .kml adentro
 *
 * shpjs se carga solo cuando hace falta (import dinámico) para no engordar el
 * arranque. Igual queda en el cache del service worker, así funciona offline.
 */

import { strFromU8, unzipSync } from 'fflate'
import { desdeGeoJSON, type LoteImportado } from './geojson'
import { desdeKML } from './kml'

function extension(nombre: string): string {
  const m = nombre.toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1] : ''
}

function coordenadasPlausibles(l: LoteImportado): boolean {
  return l.puntos.every(
    ([lat, lng]) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180,
  )
}

async function desdeZip(file: File): Promise<LoteImportado[]> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let entradas: Record<string, Uint8Array>
  try {
    entradas = unzipSync(bytes)
  } catch {
    throw new Error('No se pudo abrir el archivo comprimido.')
  }
  const nombres = Object.keys(entradas)
  const hayShp = nombres.some((n) => n.toLowerCase().endsWith('.shp'))
  const kml = nombres.find((n) => n.toLowerCase().endsWith('.kml'))

  if (hayShp) {
    const shp = (await import('shpjs')).default
    const gj = await shp(await file.arrayBuffer())
    return (Array.isArray(gj) ? gj : [gj]).flatMap((fc) => desdeGeoJSON(fc))
  }
  if (kml) {
    return desdeKML(strFromU8(entradas[kml]))
  }
  throw new Error('El .zip no tiene un .shp ni un .kml adentro.')
}

export async function importarArchivo(file: File): Promise<LoteImportado[]> {
  const ext = extension(file.name)
  let lotes: LoteImportado[]

  if (ext === 'kml') {
    lotes = desdeKML(await file.text())
  } else if (ext === 'geojson' || ext === 'json') {
    lotes = desdeGeoJSON(JSON.parse(await file.text()))
  } else if (ext === 'kmz' || ext === 'zip') {
    lotes = await desdeZip(file)
  } else {
    throw new Error(
      'Formato no reconocido. Usá KML, KMZ, GeoJSON o un .zip con el shapefile.',
    )
  }

  lotes = lotes.filter((l) => l.puntos.length >= 3)
  if (!lotes.length) {
    throw new Error('No encontré ningún lote (polígono) en el archivo.')
  }
  if (lotes.some((l) => !coordenadasPlausibles(l))) {
    throw new Error(
      'Las coordenadas no parecen lat/long. Si es un shapefile, exportalo desde ' +
        'Pix4Dfields en WGS84 (EPSG:4326).',
    )
  }
  return lotes
}
