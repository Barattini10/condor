/**
 * Modelo de datos de la bitácora.
 *
 * Los campos numéricos que se cargan en formularios se guardan como texto tal
 * cual los tipeó el usuario (con coma o punto). La capa de cálculo (lib/calculos)
 * los interpreta. `Lote.ha` es la excepción: sale de la geometría, es número.
 *
 * `id`, `updatedAt` y `deleted` están desde ya para que la sincronización con la
 * nube (Etapa 2) enganche sin migrar datos.
 */

export type PuntoLatLng = [number, number]

export type OrigenLote = 'dibujado' | 'importado'

export type TipoTrabajo = 'Pulverización' | 'Siembra' | 'Fertilización' | 'Mapeo'

export interface Vuelo {
  bateria: string
  ha: string
  min: string
  /** Cantidad aplicada en el vuelo. Litros o kg según el tipo (ver lib/unidades). */
  litros: string
}

export interface Gastos {
  quimico: string
  combustible: string
  viaticos: string
  otros: string
}

export interface Lote {
  id: string
  nombre: string
  establecimiento: string
  cliente: string
  puntos: PuntoLatLng[]
  ha: number
  origen: OrigenLote
  updatedAt: string
  deleted: boolean
}

export interface Trabajo {
  id: string
  loteId: string
  fecha: string
  tipo: TipoTrabajo
  cultivo: string
  producto: string
  /** Dosis como número (texto). La unidad (l/ha o kg/ha) sale del tipo. */
  dosis: string
  condiciones: string
  /** Superficie aplicada, en ha. Se usa si no hay detalle de vuelos. */
  ha: string
  /** Minutos totales de vuelo. Se usa si no hay detalle de vuelos. */
  minutos: string
  /** Cantidad total aplicada (litros o kg según tipo). Se usa si no hay detalle. */
  litros: string
  vuelos: Vuelo[]
  gastos: Gastos
  facturado: string
  updatedAt: string
  deleted: boolean
}

export interface Bitacora {
  lotes: Lote[]
  trabajos: Trabajo[]
}
