/** Formulario para nombrar un lote recién dibujado en el mapa. */

import { useState } from 'react'
import { useBitacora } from '../datos/bitacora-context'
import type { PuntoLatLng } from '../tipos'
import { nha } from '../lib/formato'

export function FormNuevoLote({
  puntos,
  ha,
  onCancelar,
  onCreado,
}: {
  puntos: PuntoLatLng[]
  ha: number
  onCancelar: () => void
  onCreado: (loteId: string) => void
}) {
  const { crearLote } = useBitacora()
  const [nombre, setNombre] = useState('')
  const [establecimiento, setEstablecimiento] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!nombre.trim() || guardando) return
    setGuardando(true)
    const l = await crearLote({
      nombre: nombre.trim(),
      establecimiento: establecimiento.trim(),
      puntos,
      ha,
      origen: 'dibujado',
    })
    onCreado(l.id)
  }

  return (
    <>
      <div className="p-cabeza">
        <div>
          <h2>Nuevo lote</h2>
          <div className="meta">{nha(ha)} ha marcadas</div>
        </div>
      </div>
      <div className="p-cuerpo">
        <div className="form-grid">
          <div className="campo ancho">
            <label htmlFor="f-nombre">Nombre del lote</label>
            <input
              id="f-nombre"
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Lote 4, La Costa, El Bajo…"
            />
          </div>
          <div className="campo ancho">
            <label htmlFor="f-est">Establecimiento o cliente</label>
            <input
              id="f-est"
              value={establecimiento}
              onChange={(e) => setEstablecimiento(e.target.value)}
              placeholder="Ej. Alejandro Amil"
            />
          </div>
        </div>
        <div className="acciones">
          <button className="btn-cancelar" onClick={onCancelar}>
            Descartar
          </button>
          <button
            className="btn-guardar"
            onClick={guardar}
            disabled={!nombre.trim() || guardando}
          >
            Guardar lote
          </button>
        </div>
      </div>
    </>
  )
}
