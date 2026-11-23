/**
 * Contexto y tipos de la bitácora. Separado de <BitacoraProvider> para que el
 * hot-reload de Vite funcione bien (un archivo, o componentes o utilidades, no
 * las dos cosas).
 */

import { createContext, useContext } from 'react'
import type { Lote, OrigenLote, PuntoLatLng, Trabajo } from '../tipos'

export interface DatosNuevoLote {
  nombre: string
  establecimiento: string
  cliente?: string
  puntos: PuntoLatLng[]
  ha: number
  origen: OrigenLote
}

/** Campos editables de un trabajo (sin la metadata que maneja el store). */
export type DatosTrabajo = Omit<Trabajo, 'id' | 'loteId' | 'updatedAt' | 'deleted'>

/** Campos de un lote que se pueden editar después de creado: los datos y,
 * desde "Editar forma", también la geometría (puntos + hectáreas). */
export type DatosEdicionLote = Partial<
  Pick<Lote, 'nombre' | 'establecimiento' | 'cliente' | 'puntos' | 'ha'>
>

export interface BitacoraApi {
  lotes: Lote[]
  trabajos: Trabajo[]
  cargando: boolean
  trabajosDeLote: (loteId: string) => Trabajo[]
  lotePorId: (id: string) => Lote | undefined
  crearLote: (d: DatosNuevoLote) => Promise<Lote>
  actualizarLote: (id: string, cambios: DatosEdicionLote) => Promise<void>
  borrarLote: (id: string) => Promise<void>
  guardarTrabajo: (
    loteId: string,
    trabajoId: string | null,
    d: DatosTrabajo,
  ) => Promise<Trabajo>
  borrarTrabajo: (id: string) => Promise<void>
  exportarBackup: () => void
  importarBackup: (file: File) => Promise<void>
}

export const BitacoraContext = createContext<BitacoraApi | null>(null)

export function useBitacora(): BitacoraApi {
  const c = useContext(BitacoraContext)
  if (!c) throw new Error('useBitacora() se usa dentro de <BitacoraProvider>')
  return c
}
