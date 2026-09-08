/**
 * Interpreta lo que el usuario pega en "Ir a ubicación":
 *  - coordenadas decimales sueltas: -33.8095, -59.5069
 *  - grados/minutos/segundos (lo que da Google Maps al compartir): 33°53'09.6"S 59°30'49.0"W
 *  - links de Google Maps / WhatsApp / Apple Maps / geo:
 *  - links acortados (maps.app.goo.gl): se resuelven con `resolverUbicacion` si hay señal.
 *
 * `parseUbicacion` es pura y sin red. `resolverUbicacion` es la que puede ir a
 * la red para seguir la redirección de un link acortado.
 */

export interface Coord {
  lat: number
  lng: number
}

function enRango(lat: number, lng: number): Coord | null {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ? { lat, lng }
    : null
}

/* ---------- grados / minutos / segundos ---------- */

const DEG = '[°º˚]'
const MIN = "['’‘′]"
const SEC = "(?:''|['’‘]{2}|[\"”“″])"
const COMP_DMS =
  '(\\d{1,3}(?:\\.\\d+)?)\\s*' +
  DEG +
  '\\s*' +
  '(?:(\\d{1,2}(?:\\.\\d+)?)\\s*' +
  MIN +
  '\\s*)?' +
  '(?:(\\d{1,2}(?:\\.\\d+)?)\\s*' +
  SEC +
  '\\s*)?' +
  '([NSEOW])'
const DMS_RE = new RegExp(COMP_DMS + '[\\s,]*' + COMP_DMS, 'i')

function dmsADecimal(
  deg: string,
  min: string | undefined,
  sec: string | undefined,
  hemi: string,
): number {
  const v =
    parseFloat(deg) +
    (min ? parseFloat(min) / 60 : 0) +
    (sec ? parseFloat(sec) / 3600 : 0)
  return /[SWO]/i.test(hemi) ? -v : v
}

function parseDMS(texto: string): Coord | null {
  const m = texto.match(DMS_RE)
  if (!m) return null
  const c1 = dmsADecimal(m[1], m[2], m[3], m[4])
  const c2 = dmsADecimal(m[5], m[6], m[7], m[8])
  // Google da lat y después lng, pero por las dudas: si el primero es E/O/W y
  // el segundo N/S, están al revés.
  const primeroEsLng = /[EWO]/i.test(m[4]) && /[NS]/i.test(m[8])
  const lat = primeroEsLng ? c2 : c1
  const lng = primeroEsLng ? c1 : c2
  return enRango(lat, lng)
}

/* ---------- decimales y links ---------- */

/** `-?` grados con decimales opcionales (parte entera de 1 a 3 dígitos). */
const N = '(-?\\d{1,3}(?:\\.\\d+)?)'

const PATRONES: RegExp[] = [
  new RegExp('@' + N + ',' + N), // .../maps/@lat,lng,zoom
  new RegExp('!3d' + N + '!4d' + N), // .../data=...!3dlat!4dlng
  new RegExp(
    '[?&](?:q|ll|sll|query|destination|daddr)=' + N + ',\\s*' + N,
    'i',
  ),
  new RegExp('[?&]center=' + N + '(?:%2C|,)\\s*' + N, 'i'),
  new RegExp('[?&]mlat=' + N + '&mlon=' + N, 'i'), // OpenStreetMap
  new RegExp('^geo:' + N + ',' + N, 'i'), // geo: URI
  new RegExp('(?:^|[^\\d.-])' + N + '\\s*[,;]\\s*' + N + '(?:$|[^\\d.])'), // "lat, lng"
  new RegExp('(?:^|\\s)' + N + '\\s+' + N + '(?:$|\\s)'), // "lat lng"
]

export function parseUbicacion(entrada: string): Coord | null {
  if (!entrada) return null
  const original = entrada.trim()
  let texto = original
  try {
    texto = decodeURIComponent(original)
  } catch {
    /* si el texto tiene un % suelto, se usa tal cual */
  }

  const dms = parseDMS(texto) ?? parseDMS(original)
  if (dms) return dms

  for (const re of PATRONES) {
    const m = texto.match(re) ?? original.match(re)
    if (m) {
      const c = enRango(parseFloat(m[1]), parseFloat(m[2]))
      if (c) return c
    }
  }
  return null
}

/** Links acortados que hay que seguir por la red para saber a dónde apuntan. */
export function esLinkAcortado(entrada: string): boolean {
  return /(goo\.gl\/maps|maps\.app\.goo\.gl|bit\.ly|g\.co\/kgs|tinyurl\.com)/i.test(
    entrada,
  )
}

export type MotivoFallo = 'sin-coords' | 'link-acortado' | 'sin-conexion'

export type ResultadoUbicacion =
  | { ok: true; coord: Coord }
  | { ok: false; motivo: MotivoFallo }

/**
 * Como `parseUbicacion`, pero si es un link acortado y hay señal intenta seguir
 * la redirección para sacar las coordenadas. Best-effort: si Google no deja
 * leer la respuesta (CORS), cae en `{ ok: false, motivo: 'link-acortado' }`.
 */
export async function resolverUbicacion(
  entrada: string,
): Promise<ResultadoUbicacion> {
  const directo = parseUbicacion(entrada)
  if (directo) return { ok: true, coord: directo }

  if (!esLinkAcortado(entrada)) return { ok: false, motivo: 'sin-coords' }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, motivo: 'sin-conexion' }
  }

  try {
    const res = await fetch(entrada.trim(), { redirect: 'follow' })

    // a) URL final después de las redirecciones
    const porUrl = parseUbicacion(res.url || '')
    if (porUrl) return { ok: true, coord: porUrl }

    // b) coordenadas embebidas en el HTML de destino
    const html = await res.text()
    for (const url of html.match(/https?:\/\/[^\s"'<>\\]+/g) ?? []) {
      const c = parseUbicacion(url)
      if (c) return { ok: true, coord: c }
    }
  } catch {
    /* CORS o red caída: se informa como link no resuelto */
  }
  return { ok: false, motivo: 'link-acortado' }
}
