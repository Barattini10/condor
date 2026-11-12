/**
 * Estado central de la bitácora: los lotes y trabajos en memoria, más las
 * funciones para modificarlos. Cada cambio se guarda en IndexedDB al toque
 * (autoguardado, igual que el prototipo).
 *
 * Los componentes usan el hook `useBitacora()` (definido en bitacora-context).
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Lote, Trabajo } from '../tipos'
import * as db from './db'
import { exportarJSON, importarJSON } from './backup'
import { escucharCambios, subirLote, subirTrabajo } from './sync'
import { BitacoraContext, type BitacoraApi } from './bitacora-context'

function ahora(): string {
  return new Date().toISOString()
}

function nuevoId(): string {
  return crypto.randomUUID()
}

/** true si `remoto` es más nuevo que `local` (o no había nada local todavía). */
function esMasNuevo(remoto: { updatedAt: string }, local?: { updatedAt: string }): boolean {
  return !local || remoto.updatedAt > local.updatedAt
}

export function BitacoraProvider({ children }: { children: ReactNode }) {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [trabajos, setTrabajos] = useState<Trabajo[]>([])
  const [cargando, setCargando] = useState(true)

  // Para leer el estado más fresco desde el listener de Firestore (que se
  // arma una sola vez) sin que quede atado a los valores del primer render.
  const lotesRef = useRef(lotes)
  lotesRef.current = lotes
  const trabajosRef = useRef(trabajos)
  trabajosRef.current = trabajos

  useEffect(() => {
    db.cargarTodo().then(({ lotes, trabajos }) => {
      setLotes(lotes)
      setTrabajos(trabajos)
      setCargando(false)
    })
  }, [])

  // Sincronización (Etapa 2): aplica los cambios que lleguen de Firestore
  // (propios o del resto del equipo) si son más nuevos que lo que hay en
  // IndexedDB — "gana" el último que guardó.
  useEffect(() => {
    const dejarDeEscuchar = escucharCambios(
      (remoto) => {
        const local = lotesRef.current.find((l) => l.id === remoto.id)
        if (!esMasNuevo(remoto, local)) return
        db.guardarLote(remoto)
        setLotes((xs) => {
          if (remoto.deleted) return xs.filter((l) => l.id !== remoto.id)
          const i = xs.findIndex((l) => l.id === remoto.id)
          if (i === -1) return [...xs, remoto]
          const copia = xs.slice()
          copia[i] = remoto
          return copia
        })
      },
      (remoto) => {
        const local = trabajosRef.current.find((t) => t.id === remoto.id)
        if (!esMasNuevo(remoto, local)) return
        // Firestore no trae `imagenes` (ver sync.ts) — se preservan las que
        // ya hubiera localmente para este trabajo.
        const completo: Trabajo = { ...remoto, imagenes: local?.imagenes }
        db.guardarTrabajo(completo)
        setTrabajos((xs) => {
          if (completo.deleted) return xs.filter((t) => t.id !== completo.id)
          const i = xs.findIndex((t) => t.id === completo.id)
          if (i === -1) return [...xs, completo]
          const copia = xs.slice()
          copia[i] = completo
          return copia
        })
      },
    )
    return dejarDeEscuchar
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
        subirLote(l).catch(() => {})
        return l
      },

      async actualizarLote(id, cambios) {
        const lote = lotes.find((l) => l.id === id)
        if (!lote) return
        const actualizado: Lote = { ...lote, ...cambios, updatedAt: ahora() }
        await db.guardarLote(actualizado)
        setLotes((xs) => xs.map((l) => (l.id === id ? actualizado : l)))
        subirLote(actualizado).catch(() => {})
      },

      async borrarLote(id) {
        const t = ahora()
        const lote = lotes.find((l) => l.id === id)
        const loteBorrado = lote && { ...lote, deleted: true, updatedAt: t }
        if (loteBorrado) await db.guardarLote(loteBorrado)
        const suyos = trabajos.filter((x) => x.loteId === id)
        const trabajosBorrados = suyos.map((x) => ({ ...x, deleted: true, updatedAt: t }))
        if (trabajosBorrados.length) await db.guardarTrabajos(trabajosBorrados)
        setLotes((xs) => xs.filter((l) => l.id !== id))
        setTrabajos((xs) => xs.filter((x) => x.loteId !== id))
        if (loteBorrado) subirLote(loteBorrado).catch(() => {})
        trabajosBorrados.forEach((x) => subirTrabajo(x).catch(() => {}))
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
        subirTrabajo(t).catch(() => {})
        return t
      },

      async borrarTrabajo(id) {
        const t = trabajos.find((x) => x.id === id)
        const borrado = t && { ...t, deleted: true, updatedAt: ahora() }
        if (borrado) await db.guardarTrabajo(borrado)
        setTrabajos((xs) => xs.filter((x) => x.id !== id))
        if (borrado) subirTrabajo(borrado).catch(() => {})
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
        L.forEach((l) => subirLote(l).catch(() => {}))
        T.forEach((t) => subirTrabajo(t).catch(() => {}))
      },
    }
  }, [lotes, trabajos, cargando])

  return (
    <BitacoraContext.Provider value={api}>{children}</BitacoraContext.Provider>
  )
}
