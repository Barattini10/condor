/**
 * Productos de la mezcla aplicada en un trabajo, y el total de cada uno.
 *
 * `productosDe` es la única forma correcta de leer los productos de un
 * trabajo: si es un trabajo viejo (de antes de esta lista) convierte al vuelo
 * el campo de texto único `producto`/`dosis` en una lista de un solo producto,
 * sin tocar el dato guardado. Nadie debería leer `t.producto`/`t.dosis` directo.
 */

import type { ProductoAplicado, Trabajo } from '../tipos'
import { num, numeroTexto } from './formato'
import { unidadesDe } from './unidades'

export function productosDe(t: Trabajo): ProductoAplicado[] {
  if (t.productos) return t.productos
  const nombre = (t.producto || '').trim()
  if (!nombre) return []
  return [
    {
      nombre,
      dosis: numeroTexto(t.dosis),
      unidad: unidadesDe(t.tipo).dosisUnidadPorDefecto,
    },
  ]
}

export interface TotalProducto {
  /** Total aplicado, en la unidad base de la dosis (sin el "/ha"). */
  valor: number
  unidad: string
  /** Cuando la unidad base es cc o g y el total pasa de 1000, el equivalente en L o kg. */
  equivalente?: { valor: number; unidad: string }
}

/** Unidad de dosis ("L/ha", "cc/ha"...) -> unidad del total ("L", "cc"...). */
function unidadBase(unidadDosis: string): string {
  return unidadDosis.replace(/\/ha$/i, '')
}

export function totalProducto(ha: number, p: ProductoAplicado): TotalProducto {
  const valor = ha * num(p.dosis)
  const unidad = unidadBase(p.unidad)
  let equivalente: TotalProducto['equivalente']
  if (valor > 1000) {
    if (unidad === 'cc') equivalente = { valor: valor / 1000, unidad: 'L' }
    else if (unidad === 'g') equivalente = { valor: valor / 1000, unidad: 'kg' }
  }
  return { valor, unidad, equivalente }
}
