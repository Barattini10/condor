/**
 * Persistencia local en IndexedDB (base del navegador). Reemplaza al
 * `window.storage` del prototipo, que no existía en un navegador real.
 *
 * Un store por tipo de registro, con `id` como clave. Los borrados son "blandos"
 * (deleted: true) para que la sincronización de la Etapa 2 pueda propagarlos.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Lote, Trabajo } from '../tipos'

interface CondorDB extends DBSchema {
  lotes: { key: string; value: Lote }
  trabajos: { key: string; value: Trabajo; indexes: { loteId: string } }
  meta: { key: string; value: unknown }
}

const NOMBRE = 'condor'
const VERSION = 1

let dbp: Promise<IDBPDatabase<CondorDB>> | null = null

function db(): Promise<IDBPDatabase<CondorDB>> {
  if (!dbp) {
    dbp = openDB<CondorDB>(NOMBRE, VERSION, {
      upgrade(d) {
        d.createObjectStore('lotes', { keyPath: 'id' })
        const trabajos = d.createObjectStore('trabajos', { keyPath: 'id' })
        trabajos.createIndex('loteId', 'loteId')
        d.createObjectStore('meta')
      },
    })
  }
  return dbp
}

/** Trae todo lo no borrado. */
export async function cargarTodo(): Promise<{ lotes: Lote[]; trabajos: Trabajo[] }> {
  const d = await db()
  const [lotes, trabajos] = await Promise.all([d.getAll('lotes'), d.getAll('trabajos')])
  return {
    lotes: lotes.filter((l) => !l.deleted),
    trabajos: trabajos.filter((t) => !t.deleted),
  }
}

export async function guardarLote(l: Lote): Promise<void> {
  await (await db()).put('lotes', l)
}

export async function guardarTrabajo(t: Trabajo): Promise<void> {
  await (await db()).put('trabajos', t)
}

/** Guarda varios registros de una (import / restore de backup). */
export async function guardarLotes(ls: Lote[]): Promise<void> {
  const d = await db()
  const tx = d.transaction('lotes', 'readwrite')
  await Promise.all([...ls.map((l) => tx.store.put(l)), tx.done])
}

export async function guardarTrabajos(ts: Trabajo[]): Promise<void> {
  const d = await db()
  const tx = d.transaction('trabajos', 'readwrite')
  await Promise.all([...ts.map((t) => tx.store.put(t)), tx.done])
}

export async function leerMeta<T = unknown>(clave: string): Promise<T | undefined> {
  return (await (await db()).get('meta', clave)) as T | undefined
}

export async function escribirMeta(clave: string, valor: unknown): Promise<void> {
  await (await db()).put('meta', valor, clave)
}
