/**
 * Cálculos de un trabajo: hectáreas, tiempo, litros, caudal, costos y margen.
 * Todas funciones puras. Portado del prototipo.
 *
 * Regla general: si hay detalle de vuelos cargado, manda la suma de los vuelos;
 * si no, se usan los totales que el usuario cargó a mano.
 */

import type { Trabajo, Vuelo } from '../tipos'
import { num } from './formato'

/** Vuelos con algún dato cargado (ignora filas vacías). */
export function vuelosValidos(t: Trabajo): Vuelo[] {
  return (t.vuelos || []).filter((v) => num(v.ha) || num(v.min) || num(v.litros))
}

export function haTrabajo(t: Trabajo): number {
  const vs = vuelosValidos(t)
  if (vs.length) {
    const s = vs.reduce((acc, v) => acc + num(v.ha), 0)
    if (s > 0) return s
  }
  return num(t.ha)
}

export function minTrabajo(t: Trabajo): number {
  const vs = vuelosValidos(t)
  const s = vs.reduce((acc, v) => acc + num(v.min), 0)
  return s > 0 ? s : num(t.minutos)
}

export function litrosTrabajo(t: Trabajo): number {
  const vs = vuelosValidos(t)
  const s = vs.reduce((acc, v) => acc + num(v.litros), 0)
  return s > 0 ? s : num(t.litros)
}

/** Caudal real aplicado, en l/ha. 0 si no se puede calcular. */
export function caudalReal(t: Trabajo): number {
  const h = haTrabajo(t)
  const l = litrosTrabajo(t)
  return h > 0 && l > 0 ? l / h : 0
}

export function costoTotal(t: Trabajo): number {
  const g = t.gastos
  return num(g.quimico) + num(g.combustible) + num(g.viaticos) + num(g.otros)
}

export function margen(t: Trabajo): number {
  return num(t.facturado) - costoTotal(t)
}

export function margenHa(t: Trabajo): number {
  const h = haTrabajo(t)
  return h > 0 ? margen(t) / h : 0
}

/** ha por hora de vuelo. 0 si falta el tiempo. */
export function rendimiento(t: Trabajo): number {
  const h = haTrabajo(t)
  const m = minTrabajo(t)
  return h > 0 && m > 0 ? h / (m / 60) : 0
}
