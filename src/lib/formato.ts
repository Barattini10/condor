/** Formateo de números, plata y fechas. Portado del prototipo. */

/** Texto de input -> número. Acepta coma o punto. Nunca devuelve NaN. */
export function num(v: unknown): number {
  const x = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(x) ? x : 0
}

/**
 * Extrae el número inicial de un texto: '10 l/ha' -> '10', '6' -> '6', '' -> ''.
 * Sirve para limpiar dosis viejas (que eran texto libre) al mostrarlas o
 * editarlas. Conserva la coma decimal.
 */
export function numeroTexto(s: unknown): string {
  const m = String(s ?? '').trim().match(/-?\d+(?:[.,]\d+)?/)
  return m ? m[0] : ''
}

/** Escapa texto para meterlo dentro de un string HTML (informe, SVG). */
export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      default: return '&quot;'
    }
  })
}

/** 12345 -> "$12.345" ; -12345 -> "-$12.345" */
export function plata(v: number): string {
  return (v < 0 ? '-$' : '$') + Math.round(Math.abs(v)).toLocaleString('es-AR')
}

/** Hectáreas con hasta 1 decimal. */
export function nha(v: number): string {
  return (Math.round(v * 10) / 10).toLocaleString('es-AR', { maximumFractionDigits: 1 })
}

/** Número con hasta 2 decimales. */
export function n2(v: number): string {
  return (Math.round(v * 100) / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

/** "2026-09-07" -> "07/09" */
export function fechaCorta(f: string): string {
  const p = (f || '').split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}` : f || ''
}

/** "2026-09-07" -> "07/09/2026" */
export function fechaCortaConAno(f: string): string {
  const p = (f || '').split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : f || ''
}

/** "2026-09-07" -> "7 de septiembre de 2026" */
export function fechaLarga(f: string): string {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  const p = (f || '').split('-')
  if (p.length !== 3) return f || ''
  return `${parseInt(p[2], 10)} de ${meses[parseInt(p[1], 10) - 1]} de ${p[0]}`
}

/** Minutos -> "1 h 20 min" / "45 min" */
export function tiempo(min: number): string {
  min = Math.round(min)
  const h = Math.floor(min / 60)
  const r = min % 60
  return h > 0 ? `${h} h ${r} min` : `${r} min`
}

/**
 * Texto de input de tiempo de vuelo -> minutos (decimal). Acepta "mm:ss"
 * (como lo muestra el joystick del dron, ej. "10:26" = 10 min 26 seg) y,
 * para no romper datos viejos, también un número suelto ("45" = 45 min).
 */
export function minSeg(v: unknown): number {
  const s = String(v ?? '').trim()
  const m = s.match(/^(\d+):([0-5]?\d)$/)
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / 60
  return num(s)
}

/** Minutos (decimal) -> "mm:ss", ej. 10,4333 -> "10:26". */
export function minASeg(min: number): string {
  const totalSeg = Math.round(min * 60)
  const mm = Math.floor(totalSeg / 60)
  const ss = totalSeg % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}

/** Fecha de hoy en formato "YYYY-MM-DD" (local). */
export function hoyISO(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}
