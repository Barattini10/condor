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

/** Un producto dentro de la mezcla aplicada en un trabajo, con su dosis. */
export interface ProductoAplicado {
  nombre: string
  /** Dosis por hectárea, como número (texto). La unidad es independiente. */
  dosis: string
  /** 'L/ha' | 'cc/ha' | 'kg/ha' | 'g/ha', según lo que permita el tipo. */
  unidad: string
}

export interface Gastos {
  quimico: string
  combustible: string
  viaticos: string
  otros: string
  /** Solo informativo: no entra en costoTotal ni en el margen. */
  kilometrosRecorridos?: string
  /** Litros de nafta de los grupos electrógenos. Solo informativo: la plata
   * de esa nafta ya está en `combustible`. No entra en costoTotal ni en el margen. */
  litrosNafta?: string
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
  /** Drone con el que se hizo el trabajo (ej. "DJI Agras T100", "Mavic 3M"). */
  equipo: string
  /** @deprecated Reemplazado por `productos`. Se conserva solo para leer
   * trabajos viejos — ver lib/productos.ts (`productosDe`). No se vuelve a
   * escribir desde el formulario. */
  producto: string
  /** @deprecated Ídem `producto`. */
  dosis: string
  /** La mezcla aplicada: un producto por fila, con su dosis y unidad. */
  productos?: ProductoAplicado[]
  condiciones: string
  /** Cantidad de baterías en rotación. Se usa para ciclar el nº de batería por vuelo. */
  baterias: string
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
