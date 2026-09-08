/**
 * Arma el informe de aplicación para el cliente como un documento HTML completo.
 * Se muestra en un <iframe> y desde ahí se imprime o se guarda como PDF (todo
 * offline). No incluye datos de plata. Portado del prototipo.
 */

import type { Lote, PuntoLatLng, Trabajo } from '../tipos'
import { centro } from '../lib/geo'
import { esc, fechaCorta, fechaLarga, n2, nha, num, tiempo } from '../lib/formato'
import {
  caudalReal,
  haTrabajo,
  litrosTrabajo,
  minTrabajo,
  vuelosValidos,
} from '../lib/calculos'

const EQUIPO = 'DJI Agras T100'

/** Dibujo esquemático del lote, normalizado a un cuadro de 100x100. */
function svgLote(pts: PuntoLatLng[]): string {
  if (!pts || pts.length < 3) return ''
  const lat0 = centro(pts)[0]
  const k = Math.cos((lat0 * Math.PI) / 180)
  const xs = pts.map((p) => p[1] * k)
  const ys = pts.map((p) => -p[0])
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  const w = x1 - x0 || 1
  const h = y1 - y0 || 1
  const escala = 100 / Math.max(w, h)
  const ox = (100 - w * escala) / 2
  const oy = (100 - h * escala) / 2
  const d =
    pts
      .map((p, i) => {
        const x = (p[1] * k - x0) * escala + ox
        const y = (-p[0] - y0) * escala + oy
        return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(' ') + ' Z'
  return (
    '<svg viewBox="-4 -4 108 108" width="120" height="120" xmlns="http://www.w3.org/2000/svg">' +
    `<path d="${d}" fill="#d7e5d0" stroke="#40673b" stroke-width="2" stroke-linejoin="round"/></svg>`
  )
}

export interface Informe {
  html: string
  nombre: string
}

export function armarInforme(t: Trabajo, lote: Lote): Informe {
  const vs = vuelosValidos(t)
  const ha = haTrabajo(t)
  const mi = minTrabajo(t)
  const li = litrosTrabajo(t)
  const cr = caudalReal(t)

  const filas = vs
    .map((v, i) => {
      const vha = num(v.ha)
      const vmin = num(v.min)
      const vli = num(v.litros)
      return (
        `<tr><td class="c">${i + 1}</td><td class="c">${esc(v.bateria || i + 1)}</td>` +
        `<td class="d">${nha(vha)}</td><td class="d">${n2(vmin)}</td>` +
        `<td class="d">${vli ? n2(vli) : '—'}</td>` +
        `<td class="d">${vmin > 0 ? nha(vha / (vmin / 60)) : '—'}</td></tr>`
      )
    })
    .join('')

  const dato = (et: string, va: string | number | undefined): string =>
    va ? `<div class="dato"><span>${et}</span><b>${va}</b></div>` : ''

  const html =
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    `<title>Informe ${esc(lote.nombre)} ${esc(fechaCorta(t.fecha))}</title><style>` +
    '@page{size:A4;margin:16mm}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#20261c;background:#fff;margin:0;padding:26px 22px;line-height:1.45;font-size:14px;max-width:760px}' +
    '.cab{display:flex;align-items:flex-start;gap:16px;border-bottom:3px solid #40673b;padding-bottom:14px;margin-bottom:20px}' +
    '.marca{font-size:22px;font-weight:700;color:#40673b;letter-spacing:-.02em;line-height:1.1}' +
    '.marca small{display:block;font-size:11.5px;font-weight:500;color:#6b7a63;letter-spacing:.02em;margin-top:3px}' +
    '.cab .der{margin-left:auto;text-align:right;font-size:12px;color:#6b7a63}' +
    '.cab .der b{display:block;font-size:15px;color:#20261c}' +
    'h2{font-size:12px;color:#40673b;margin:24px 0 10px;font-weight:700;border-bottom:1px solid #d7e5d0;padding-bottom:5px}' +
    '.ident{display:flex;gap:18px;align-items:center;background:#f4f7f2;border-radius:6px;padding:14px 16px}' +
    '.ident .txt{flex:1}' +
    '.ident .txt h1{font-size:20px;margin:0 0 3px;letter-spacing:-.02em}' +
    '.ident .txt p{margin:0;color:#6b7a63;font-size:13px}' +
    '.datos{display:flex;flex-wrap:wrap;gap:20px 28px}' +
    '.dato span{display:block;font-size:11px;color:#6b7a63;margin-bottom:1px}' +
    '.dato b{font-size:16px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.01em}' +
    'table{width:100%;border-collapse:collapse;margin-top:4px;font-size:13px}' +
    'th{text-align:right;font-size:10.5px;color:#6b7a63;font-weight:600;border-bottom:1px solid #40673b;padding:0 7px 5px}' +
    'th:first-child,th:nth-child(2){text-align:center}' +
    'td{padding:6px 7px;border-bottom:1px solid #e6ebe3;font-variant-numeric:tabular-nums}' +
    'td.c{text-align:center;color:#6b7a63}td.d{text-align:right}' +
    'tfoot td{font-weight:700;border-top:2px solid #40673b;border-bottom:none;background:#f4f7f2}' +
    '.pie{margin-top:26px;padding-top:12px;border-top:1px solid #d7e5d0;font-size:11px;color:#8a9682}' +
    '.imprimir{background:#40673b;color:#fff;border:none;border-radius:5px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:18px;font-family:inherit}' +
    '@media print{.imprimir{display:none}body{padding:0}}' +
    '</style></head><body>' +
    '<button class="imprimir" onclick="window.print()">Imprimir o guardar en PDF</button>' +
    `<div class="cab"><div class="marca">Cóndor Agro<small>Aplicaciones aéreas de precisión · Baradero, Bs. As.</small></div>` +
    `<div class="der"><b>Informe de aplicación</b>${esc(fechaLarga(t.fecha))}</div></div>` +
    `<div class="ident">${svgLote(lote.puntos || [])}` +
    `<div class="txt"><h1>${esc(lote.nombre)}</h1>` +
    `<p>${esc(lote.establecimiento || '')}${
      lote.ha ? ` · superficie del lote ${nha(lote.ha)} ha` : ''
    }</p></div></div>` +
    '<h2>Trabajo realizado</h2><div class="datos">' +
    dato('Tipo', esc(t.tipo)) +
    dato('Cultivo', esc(t.cultivo)) +
    dato('Superficie aplicada', `${nha(ha)} ha`) +
    dato('Producto', esc(t.producto)) +
    dato('Dosis', esc(t.dosis)) +
    dato('Caudal aplicado', cr ? `${n2(cr)} l/ha` : '') +
    dato('Caldo total', li ? `${n2(li)} litros` : '') +
    dato('Condiciones', esc(t.condiciones)) +
    '</div>' +
    '<h2>Operación</h2><div class="datos">' +
    dato('Vuelos', vs.length || '') +
    dato('Baterías', vs.length || '') +
    dato('Tiempo total de vuelo', mi ? tiempo(mi) : '') +
    dato('Rendimiento', ha && mi ? `${nha(ha / (mi / 60))} ha/h` : '') +
    dato('Promedio por batería', vs.length ? `${nha(ha / vs.length)} ha` : '') +
    dato('Equipo', EQUIPO) +
    '</div>' +
    (vs.length
      ? '<h2>Registro de vuelos</h2><table><thead><tr>' +
        '<th>#</th><th>Batería</th><th>Hectáreas</th><th>Minutos</th><th>Litros</th><th>ha/h</th></tr></thead>' +
        `<tbody>${filas}</tbody><tfoot><tr><td class="c" colspan="2">Total</td>` +
        `<td class="d">${nha(ha)}</td><td class="d">${n2(mi)}</td>` +
        `<td class="d">${li ? n2(li) : '—'}</td><td class="d">${
          mi > 0 ? nha(ha / (mi / 60)) : '—'
        }</td></tr></tfoot></table>`
      : '') +
    '<div class="pie">Informe generado por Cóndor Agro. Los datos de vuelo corresponden al registro del equipo en la fecha indicada.</div>' +
    '</body></html>'

  const slug = String(lote.nombre || 'lote')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
  return { html, nombre: `informe-${slug}-${t.fecha || ''}.html` }
}
