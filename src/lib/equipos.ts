/**
 * Los drones que usa Cóndor Agro, y cómo agrupar trabajos por equipo.
 * Único lugar donde vive esta lista (antes estaba copiada en FormTrabajo.tsx
 * y en armarInforme.ts).
 */

import type { Trabajo } from '../tipos'

export const EQUIPOS = ['DJI Agras T100', 'Mavic 3M']

/** Equipo a usar cuando el trabajo no tiene uno cargado (datos viejos). */
export const EQUIPO_POR_DEFECTO = EQUIPOS[0]

/** Equipo de un trabajo, con el fallback de datos viejos ya aplicado. */
export function equipoDe(t: Trabajo): string {
  return t.equipo || EQUIPO_POR_DEFECTO
}

/** Nombre corto para lugares con poco espacio (la barra superior). */
export function nombreCortoEquipo(equipo: string): string {
  return equipo.replace('DJI Agras ', '')
}

export interface GrupoEquipo {
  equipo: string
  trabajos: Trabajo[]
}

/**
 * Agrupa trabajos por equipo. El orden es el de EQUIPOS; un equipo que no
 * esté en esa lista (por si se agrega uno nuevo) va al final. Solo devuelve
 * los equipos que realmente tienen trabajos.
 */
export function agruparPorEquipo(trabajos: Trabajo[]): GrupoEquipo[] {
  const porEquipo = new Map<string, Trabajo[]>()
  for (const t of trabajos) {
    const eq = equipoDe(t)
    const lista = porEquipo.get(eq)
    if (lista) lista.push(t)
    else porEquipo.set(eq, [t])
  }
  const otros = [...porEquipo.keys()].filter((eq) => !EQUIPOS.includes(eq))
  return [...EQUIPOS, ...otros]
    .filter((eq) => porEquipo.has(eq))
    .map((equipo) => ({ equipo, trabajos: porEquipo.get(equipo)! }))
}
