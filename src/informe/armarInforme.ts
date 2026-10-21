/**
 * Arma el informe de aplicación para el cliente como un documento HTML completo.
 * Se muestra en un <iframe> y desde ahí se imprime o se guarda como PDF (todo
 * offline). No incluye datos de plata. Portado del prototipo.
 */

import type { Lote, Trabajo } from '../tipos'
import {
  esc,
  fechaCorta,
  fechaLarga,
  hoyISO,
  n2,
  nha,
  num,
  tiempo,
} from '../lib/formato'
import {
  caudalReal,
  haTrabajo,
  litrosTrabajo,
  minTrabajo,
  vuelosValidos,
} from '../lib/calculos'
import { unidadesDe } from '../lib/unidades'
import { equipoDe } from '../lib/equipos'
import { productosDe, totalProducto } from '../lib/productos'

/** Datos de contacto del pie del informe. Cambiar acá y listo. */
const CONTACTO = 'Cóndor Agro Integral · +54 9 3329-601189 · @condoragrointegral'

/** Cantidad de baterías por defecto para el ciclo del nº de batería. */
const BATERIAS_POR_DEFECTO = 3


export interface Informe {
  html: string
  nombre: string
}

export function armarInforme(t: Trabajo, lote: Lote): Informe {
  const u = unidadesDe(t.tipo)
  const vs = vuelosValidos(t)
  const ha = haTrabajo(t)
  const mi = minTrabajo(t)
  const li = litrosTrabajo(t)
  const cr = caudalReal(t)
  const productos = productosDe(t)
  const equipo = equipoDe(t)
  const nBaterias = num(t.baterias) > 0 ? Math.round(num(t.baterias)) : BATERIAS_POR_DEFECTO
  const insumoTh =
    u.insumoColumna.charAt(0).toUpperCase() + u.insumoColumna.slice(1)

  const filas = vs
    .map((v, i) => {
      const vha = num(v.ha)
      const vmin = num(v.min)
      const vli = num(v.litros)
      const bateria = v.bateria || (i % nBaterias) + 1
      return (
        `<tr><td class="c">${i + 1}</td><td class="c">${esc(bateria)}</td>` +
        `<td class="d">${nha(vha)}</td><td class="d">${n2(vmin)}</td>` +
        (u.insumo ? `<td class="d">${vli ? n2(vli) : '—'}</td>` : '') +
        `</tr>`
      )
    })
    .join('')

  const filasProductos = productos
    .map((p) => {
      const tot = totalProducto(ha, p)
      const texto = tot.valor
        ? `${n2(tot.valor)} ${tot.unidad}` +
          (tot.equivalente
            ? ` (${n2(tot.equivalente.valor)} ${tot.equivalente.unidad})`
            : '')
        : '—'
      return (
        `<tr><td>${esc(p.nombre)}</td>` +
        `<td class="d">${n2(num(p.dosis))} ${esc(p.unidad)}</td>` +
        `<td class="d">${texto}</td></tr>`
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
    '.logo-espacio{flex:0 0 auto;width:120px;height:120px}' +
    '.ident .txt{flex:1}' +
    '.ident .txt h1{font-size:20px;margin:0 0 3px;letter-spacing:-.02em}' +
    '.ident .txt p{margin:0;color:#6b7a63;font-size:13px}' +
    '.datos{display:flex;flex-wrap:wrap;gap:20px 28px}' +
    '.dato span{display:block;font-size:11px;color:#6b7a63;margin-bottom:1px}' +
    '.dato b{font-size:16px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.01em}' +
    'table{width:100%;border-collapse:collapse;margin-top:4px;font-size:13px}' +
    'th{text-align:right;font-size:10.5px;color:#6b7a63;font-weight:600;border-bottom:1px solid #40673b;padding:0 7px 5px}' +
    'th:first-child,th:nth-child(2){text-align:center}' +
    '.mezcla th:nth-child(1),.mezcla td:nth-child(1){text-align:left}' +
    '.mezcla th:nth-child(2){text-align:right}' +
    'td{padding:6px 7px;border-bottom:1px solid #e6ebe3;font-variant-numeric:tabular-nums}' +
    'td.c{text-align:center;color:#6b7a63}td.d{text-align:right}' +
    'tfoot td{font-weight:700;border-top:2px solid #40673b;border-bottom:none;background:#f4f7f2}' +
    '.pie{margin-top:26px;padding-top:12px;border-top:1px solid #d7e5d0;font-size:11px;color:#8a9682}' +
    '.imprimir{background:#40673b;color:#fff;border:none;border-radius:5px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:18px;font-family:inherit}' +
    '@media print{.imprimir{display:none}body{padding:0}}' +
    '</style></head><body>' +
    '<button class="imprimir" onclick="window.print()">Imprimir o guardar en PDF</button>' +
    `<div class="cab"><div class="marca">Cóndor Agro<small>Aplicaciones aéreas de precisión · Baradero, Bs. As.</small></div>` +
    `<div class="der"><b>Informe de aplicación</b></div></div>` +
    `<div class="ident"><div class="logo-espacio"></div>` +
    `<div class="txt"><h1>${esc(lote.nombre)}</h1>` +
    `<p>${esc(lote.establecimiento || '')}${
      lote.ha ? ` · superficie del lote ${nha(lote.ha)} ha` : ''
    }</p>` +
    `<p>Fecha del trabajo: ${esc(fechaLarga(t.fecha))}</p></div></div>` +
    '<h2>Trabajo realizado</h2><div class="datos">' +
    dato('Tipo', esc(t.tipo)) +
    dato('Cultivo', esc(t.cultivo)) +
    dato('Superficie aplicada', `${nha(ha)} ha`) +
    dato('Caudal aplicado', u.caudal && cr ? `${n2(cr)} ${u.caudalUnidad}` : '') +
    dato(
      u.insumoColumna === 'kg' ? 'Total aplicado' : 'Caldo total',
      u.insumo && li ? `${n2(li)} ${u.insumoColumna}` : '',
    ) +
    dato('Condiciones', esc(t.condiciones)) +
    '</div>' +
    (u.producto && productos.length
      ? '<h2>Mezcla aplicada</h2><table class="mezcla"><thead><tr>' +
        '<th>Producto</th><th>Dosis/ha</th><th>Total aplicado</th>' +
        `</tr></thead><tbody>${filasProductos}</tbody></table>`
      : '') +
    '<h2>Operación</h2><div class="datos">' +
    dato('Vuelos', vs.length || '') +
    dato('Baterías', vs.length || '') +
    dato('Tiempo total de vuelo', mi ? tiempo(mi) : '') +
    dato('Promedio por batería', vs.length ? `${nha(ha / vs.length)} ha` : '') +
    dato('Equipo', esc(equipo)) +
    '</div>' +
    (vs.length
      ? '<h2>Registro de vuelos</h2><table><thead><tr>' +
        '<th>#</th><th>Batería</th><th>Hectáreas</th><th>Minutos</th>' +
        (u.insumo ? `<th>${insumoTh}</th>` : '') +
        '</tr></thead>' +
        `<tbody>${filas}</tbody><tfoot><tr><td class="c" colspan="2">Total</td>` +
        `<td class="d">${nha(ha)}</td><td class="d">${n2(mi)}</td>` +
        (u.insumo ? `<td class="d">${li ? n2(li) : '—'}</td>` : '') +
        `</tr></tfoot></table>`
      : '') +
    (t.imagenes && t.imagenes.length
      ? '<h2>Mapa de aplicación</h2>' +
        t.imagenes
          .map((img) => {
            // El ancho/alto van como ATRIBUTOS del <img> (no solo por CSS):
            // es la forma más antigua y básica de indicarle un tamaño a una
            // imagen, la que cualquier motor de impresión/PDF respeta,
            // incluso los que ignoran el ancho puesto por CSS. El style
            // de abajo es la versión "linda" para cuando se ve en pantalla
            // (responsive); los atributos son la red de contención.
            const anchoFijo = 650
            const altoFijo = Math.round(
              anchoFijo * (img.ancho > 0 ? img.alto / img.ancho : 0.667),
            )
            return (
              `<img src="${esc(img.src)}" alt="Mapa de aplicación" ` +
              `width="${anchoFijo}" height="${altoFijo}" style="` +
              'display:block;width:100%;max-width:100%;height:auto;' +
              'border-radius:6px;margin:8px 0 14px">'
            )
          })
          .join('')
      : '') +
    '<div class="pie">' +
    `Datos tomados del registro de vuelo del ${esc(equipo)}.<br>` +
    `${esc(CONTACTO)}<br>` +
    `Informe emitido el ${esc(fechaLarga(hoyISO()))}.` +
    '</div>' +
    '</body></html>'

  const slug = String(lote.nombre || 'lote')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
  return { html, nombre: `informe-${slug}-${t.fecha || ''}.html` }
}
