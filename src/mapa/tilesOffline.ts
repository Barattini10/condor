/**
 * Descarga básica de imagen satelital para usar sin señal (Etapa 1).
 *
 * Recorre los tiles del recuadro que se está viendo, en el zoom actual y unos
 * niveles alrededor, y los pide con fetch(). El service worker (vite-plugin-pwa)
 * los intercepta y los guarda en cache. En el campo, el mapa los lee de ahí.
 *
 * Versión mínima a propósito: no administra el espacio ni deja elegir zonas por
 * establecimiento. Eso llega en una etapa posterior.
 */

import type { Map as LeafletMap } from 'leaflet'
import { tileXY } from '../lib/geo'
import { TILE_MAX_ZOOM, urlTile } from './config'

/** Tope de tiles por descarga, para no llenar el disco del celular. */
const TOPE_TILES = 1500

/** Cuántas descargas en paralelo. */
const EN_PARALELO = 6

export interface ProgresoDescarga {
  hechos: number
  total: number
}

export function tilesDeVista(map: LeafletMap): string[] {
  const b = map.getBounds()
  const zActual = Math.round(map.getZoom())
  const zooms: number[] = []
  for (let z = zActual - 1; z <= zActual + 2; z++) {
    if (z >= 3 && z <= TILE_MAX_ZOOM) zooms.push(z)
  }

  const urls: string[] = []
  for (const z of zooms) {
    const a = tileXY(b.getNorth(), b.getWest(), z)
    const c = tileXY(b.getSouth(), b.getEast(), z)
    const xMin = Math.min(a.x, c.x)
    const xMax = Math.max(a.x, c.x)
    const yMin = Math.min(a.y, c.y)
    const yMax = Math.max(a.y, c.y)
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        urls.push(urlTile(z, x, y))
      }
    }
  }
  return urls.slice(0, TOPE_TILES)
}

export async function descargarZona(
  map: LeafletMap,
  onProgreso?: (p: ProgresoDescarga) => void,
): Promise<ProgresoDescarga> {
  const urls = tilesDeVista(map)
  const total = urls.length
  let hechos = 0

  async function trabajador(cola: string[]): Promise<void> {
    for (const url of cola) {
      try {
        // El service worker cachea la respuesta al pasar por acá.
        await fetch(url, { mode: 'no-cors', cache: 'force-cache' })
      } catch {
        // Un tile que falla no corta la descarga.
      }
      hechos++
      onProgreso?.({ hechos, total })
    }
  }

  const colas: string[][] = Array.from({ length: EN_PARALELO }, () => [])
  urls.forEach((u, i) => colas[i % EN_PARALELO].push(u))
  await Promise.all(colas.map(trabajador))

  return { hechos, total }
}
