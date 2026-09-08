/**
 * Estado central de la bitácora: los lotes y trabajos en memoria, más las
 * funciones para modificarlos. Cada cambio se guarda en IndexedDB al toque
 * (autoguardado, igual que el prototipo).
 *
 * Los componentes usan el hook `useBitacora()` (definido en bitacora-context).
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lote, Trabajo } from '../tipos'
import * as db from './db'
import { exportarJSON, importarJSON } from './backup'
import { BitacoraContext, type BitacoraApi } from './bitacora-context'

function ahora(): string {
  return new Date().toISOString()
}

function nuevoId(): string {
  return crypto.randomUUID()
}

export function BitacoraProvider({ children }: { children: ReactNode }) {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [trabajos, setTrabajos] = useState<Trabajo[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    db.cargarTodo().then(({ lotes, trabajos }) => {
      setLotes(lotes)
      setTrabajos(trabajos)
      setCargando(false)
    })
  }, [])

  const api = useMemo<BitacoraApi>(() => {
    return {
      lotes,
      trabajos,
      cargando,

      trabajosDeLote: (loteId) => trabajos.filter((t) => t.loteId === loteId),
      lotePorId: (id) => lotes.find((l) => l.id === id),

      async crearLote(d) {
        const l: Lote = {
          id: nuevoId(),
          nombre: d.nombre,
          establecimiento: d.establecimiento,
          cliente: d.cliente ?? '',
          puntos: d.puntos,
          ha: d.ha,
          origen: d.origen,
          updatedAt: ahora(),
          deleted: false,
        }
        await db.guardarLote(l)
        setLotes((xs) => [...xs, l])
        return l
      },

      async borrarLote(id) {
        const t = ahora()
        const lote = lotes.find((l) => l.id === id)
        if (lote) await db.guardarLote({ ...lote, deleted: true, updatedAt: t })
        const suyos = trabajos.filter((x) => x.loteId === id)
        if (suyos.length) {
          await db.guardarTrabajos(
            suyos.map((x) => ({ ...x, deleted: true, updatedAt: t })),
          )
        }
        setLotes((xs) => xs.filter((l) => l.id !== id))
        setTrabajos((xs) => xs.filter((x) => x.loteId !== id))
      },

      async guardarTrabajo(loteId, trabajoId, d) {
        const existente = trabajoId
          ? trabajos.find((x) => x.id === trabajoId)
          : null
        const t: Trabajo = {
          id: existente?.id ?? nuevoId(),
          loteId,
          ...d,
          updatedAt: ahora(),
          deleted: false,
        }
        await db.guardarTrabajo(t)
        setTrabajos((xs) => {
          const i = xs.findIndex((x) => x.id === t.id)
          if (i === -1) return [...xs, t]
          const copia = xs.slice()
          copia[i] = t
          return copia
        })
        return t
      },

      async borrarTrabajo(id) {
        const t = trabajos.find((x) => x.id === id)
        if (t) await db.guardarTrabajo({ ...t, deleted: true, updatedAt: ahora() })
        setTrabajos((xs) => xs.filter((x) => x.id !== id))
      },

      exportarBackup() {
        exportarJSON(lotes, trabajos)
      },

      async importarBackup(file) {
        const { lotes: L, trabajos: T } = await importarJSON(file)
        await db.guardarLotes(L)
        await db.guardarTrabajos(T)
        const fresco = await db.cargarTodo()
        setLotes(fresco.lotes)
        setTrabajos(fresco.trabajos)
      },
    }
  }, [lotes, trabajos, cargando])

  return (
    <BitacoraContext.Provider value={api}>{children}</BitacoraContext.Provider>
  )
}
