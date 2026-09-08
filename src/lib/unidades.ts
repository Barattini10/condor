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
  /** Muestra el campo Producto. */
  producto: boolean
  /** Muestra el campo Dosis. */
  dosis: boolean
  /** Unidad fija de la dosis: 'l/ha' o 'kg/ha'. */
  dosisUnidad: string
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
  dosis: true,
  dosisUnidad: 'l/ha',
  caudal: true,
  caudalUnidad: 'l/ha',
  insumo: true,
  insumoColumna: 'litros',
  insumoTotal: 'litros de caldo',
  insumoManualLabel: 'Litros de caldo',
}

const SOLIDO: UnidadesTrabajo = {
  producto: true,
  dosis: true,
  dosisUnidad: 'kg/ha',
  caudal: false,
  caudalUnidad: '',
  insumo: true,
  insumoColumna: 'kg',
  insumoTotal: 'kg aplicados',
  insumoManualLabel: 'Kg aplicados',
}

const MAPEO: UnidadesTrabajo = {
  producto: false,
  dosis: false,
  dosisUnidad: '',
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
    case 'Fertilización':
      return SOLIDO
    case 'Mapeo':
      return MAPEO
    default:
      return PULVERIZACION
  }
}
