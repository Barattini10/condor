/** Panel de revisión: elegir cuáles lotes del archivo importar y con qué nombre. */

import { useState } from 'react'
import { useBitacora } from '../datos/bitacora-context'
import { nha } from '../lib/formato'
import type { LoteImportado } from './geojson'

export function ImportarLotes({
  lotes,
  archivo,
  onCancelar,
  onImportados,
}: {
  lotes: LoteImportado[]
  archivo: string
  onCancelar: () => void
  onImportados: () => void
}) {
  const { crearLote } = useBitacora()
  const [establecimiento, setEstablecimiento] = useState('')
  const [filas, setFilas] = useState(
    lotes.map((l) => ({ nombre: l.nombre, usar: true })),
  )
  const [guardando, setGuardando] = useState(false)

  const cuenta = filas.filter((f) => f.usar).length

  function editar(i: number, cambio: Partial<{ nombre: string; usar: boolean }>) {
    setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, ...cambio } : f)))
  }

  async function importar() {
    if (guardando || cuenta === 0) return
    setGuardando(true)
    for (let i = 0; i < lotes.length; i++) {
      if (!filas[i].usar) continue
      await crearLote({
        nombre: filas[i].nombre.trim() || lotes[i].nombre,
        establecimiento: establecimiento.trim(),
        puntos: lotes[i].puntos,
        ha: lotes[i].ha,
        origen: 'importado',
      })
    }
    onImportados()
  }

  return (
    <>
      <div className="p-cabeza">
        <div>
          <h2>Importar lotes</h2>
          <div className="meta">
            {archivo} · {lotes.length} {lotes.length === 1 ? 'lote' : 'lotes'}
          </div>
        </div>
        <button className="cerrar" onClick={onCancelar} aria-label="Cancelar">
          ✕
        </button>
      </div>

      <div className="p-cuerpo">
        <div className="form-grid" style={{ marginBottom: 8 }}>
          <div className="campo ancho">
            <label htmlFor="imp-est">Establecimiento o cliente (para todos)</label>
            <input
              id="imp-est"
              value={establecimiento}
              onChange={(e) => setEstablecimiento(e.target.value)}
              placeholder="Ej. Alejandro Amil"
            />
          </div>
        </div>

        {filas.map((f, i) => (
          <div className="imp-fila" key={i}>
            <input
              type="checkbox"
              checked={f.usar}
              onChange={(e) => editar(i, { usar: e.target.checked })}
            />
            <input
              type="text"
              value={f.nombre}
              onChange={(e) => editar(i, { nombre: e.target.value })}
              disabled={!f.usar}
            />
            <span className="ha">{nha(lotes[i].ha)} ha</span>
          </div>
        ))}

        <div className="acciones">
          <button className="btn-cancelar" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className="btn-guardar"
            onClick={importar}
            disabled={guardando || cuenta === 0}
          >
            Importar {cuenta > 0 ? `(${cuenta})` : ''}
          </button>
        </div>
      </div>
    </>
  )
}
