/**
 * Única fuente de verdad de las unidades según el tipo de trabajo.
 * La usan el formulario, el registro de vuelos, el detalle del lote y el informe.
 *
 * La "cantidad por vuelo" se guarda siempre en el campo `litros` (del vuelo y
 * del total manual); acá se decide si en pantalla se llama litros o kg. Así no
 * hace falta migrar datos viejos.
 */

import type { TipoTrabajo } from '../tipos'

export interface UnidadesTrabajo {
  /** Muestra la sección de productos (lista, con dosis por fila). */
  producto: boolean
  /** Unidades que se pueden elegir para la dosis de cada producto. */
  unidadesDosis: string[]
  /** Unidad por defecto: fila nueva, y para migrar un producto viejo (texto suelto). */
  dosisUnidadPorDefecto: string
  /** Calcula y muestra el caudal real. */
  caudal: boolean
  /** Unidad del caudal. */
  caudalUnidad: string
  /** Muestra la columna de cantidad en el registro de vuelos y sus totales. */
  insumo: boolean
  /** Encabezado corto de la columna: 'litros' o 'kg'. */
  insumoColumna: string
  /** Etiqueta del total: 'litros de caldo' o 'kg aplicados'. */
  insumoTotal: string
  /** Etiqueta del campo de total manual: 'Litros de caldo' o 'Kg aplicados'. */
  insumoManualLabel: string
}

const PULVERIZACION: UnidadesTrabajo = {
  producto: true,
  unidadesDosis: ['L/ha', 'cc/ha'],
  dosisUnidadPorDefecto: 'L/ha',
  caudal: true,
  caudalUnidad: 'l/ha',
  insumo: true,
  insumoColumna: 'litros',
  insumoTotal: 'litros de caldo',
  insumoManualLabel: 'Litros de caldo',
}

const SIEMBRA: UnidadesTrabajo = {
  producto: true,
  unidadesDosis: ['kg/ha', 'g/ha'],
  dosisUnidadPorDefecto: 'kg/ha',
  caudal: false,
  caudalUnidad: '',
  insumo: true,
  insumoColumna: 'kg',
  insumoTotal: 'kg aplicados',
  insumoManualLabel: 'Kg aplicados',
}

/** A diferencia de Siembra, la fertilización puede ser sólida o foliar líquida. */
const FERTILIZACION: UnidadesTrabajo = {
  producto: true,
  unidadesDosis: ['kg/ha', 'g/ha', 'L/ha', 'cc/ha'],
  dosisUnidadPorDefecto: 'kg/ha',
  caudal: false,
  caudalUnidad: '',
  insumo: true,
  insumoColumna: 'kg',
  insumoTotal: 'kg aplicados',
  insumoManualLabel: 'Kg aplicados',
}

const MAPEO: UnidadesTrabajo = {
  producto: false,
  unidadesDosis: [],
  dosisUnidadPorDefecto: '',
  caudal: false,
  caudalUnidad: '',
  insumo: false,
  insumoColumna: '',
  insumoTotal: '',
  insumoManualLabel: '',
}

export function unidadesDe(tipo: TipoTrabajo): UnidadesTrabajo {
  switch (tipo) {
    case 'Siembra':
      return SIEMBRA
    case 'Fertilización':
      return FERTILIZACION
    case 'Mapeo':
      return MAPEO
    default:
      return PULVERIZACION
  }
}
