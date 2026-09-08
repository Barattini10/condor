/** Geometría sobre coordenadas lat/long. No necesita internet. */

import type { PuntoLatLng } from '../tipos'

/**
 * Área de un polígono en hectáreas (fórmula esférica). Portado del prototipo.
 * `pts` es una lista de [lat, lng].
 */
export function hectareas(pts: PuntoLatLng[]): number {
  if (!pts || pts.length < 3) return 0
  const R = 6378137
  const rad = Math.PI / 180
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += (q[1] - p[1]) * rad * (2 + Math.sin(p[0] * rad) + Math.sin(q[0] * rad))
  }
  return Math.abs((a * R * R) / 2) / 10000
}

/** Centroide simple (promedio de vértices). */
export function centro(pts: PuntoLatLng[]): PuntoLatLng {
  let la = 0
  let ln = 0
  pts.forEach((p) => {
    la += p[0]
    ln += p[1]
  })
  return [la / pts.length, ln / pts.length]
}

/** lat/lng -> índice de tile (esquema slippy / XYZ) en el zoom dado. */
export function tileXY(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  )
  return { x: clamp(x, 0, n - 1), y: clamp(y, 0, n - 1) }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
