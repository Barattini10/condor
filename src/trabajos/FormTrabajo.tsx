/** Alta y edición de un trabajo, con su registro de vuelos y sus números. */

import { useMemo, useState } from 'react'
import { useBitacora, type DatosTrabajo } from '../datos/bitacora-context'
import type { Gastos, TipoTrabajo, Trabajo, Vuelo } from '../tipos'
import { costoTotal, margen, margenHa } from '../lib/calculos'
import { hoyISO, plata } from '../lib/formato'
import { RegistroVuelos } from './RegistroVuelos'

const TIPOS: TipoTrabajo[] = [
  'Pulverización',
  'Siembra',
  'Fertilización',
  'Mapeo',
]

function gastosVacios(): Gastos {
  return { quimico: '', combustible: '', viaticos: '', otros: '' }
}

function datosIniciales(lote: { ha: number }, previo: Trabajo | undefined): DatosTrabajo {
  if (previo) {
    return {
      fecha: previo.fecha,
      tipo: previo.tipo,
      cultivo: previo.cultivo,
      producto: previo.producto,
      dosis: previo.dosis,
      condiciones: previo.condiciones,
      ha: previo.ha,
      minutos: previo.minutos,
      litros: previo.litros,
      vuelos: previo.vuelos.map((v) => ({ ...v })),
      gastos: { ...previo.gastos },
      facturado: previo.facturado,
    }
  }
  return {
    fecha: hoyISO(),
    tipo: 'Pulverización',
    cultivo: '',
    producto: '',
    dosis: '',
    condiciones: '',
    ha: String(Math.round(lote.ha * 10) / 10),
    minutos: '',
    litros: '',
    vuelos: [],
    gastos: gastosVacios(),
    facturado: '',
  }
}

export function FormTrabajo({
  loteId,
  trabajoId,
  onCerrar,
}: {
  loteId: string
  trabajoId: string | null
  onCerrar: () => void
}) {
  const { lotePorId, trabajos, guardarTrabajo } = useBitacora()
  const lote = lotePorId(loteId)
  const previo = trabajoId ? trabajos.find((t) => t.id === trabajoId) : undefined

  const [d, setD] = useState<DatosTrabajo>(() =>
    datosIniciales(lote ?? { ha: 0 }, previo),
  )
  const [guardando, setGuardando] = useState(false)

  function set<K extends keyof DatosTrabajo>(campo: K, valor: DatosTrabajo[K]) {
    setD((prev) => ({ ...prev, [campo]: valor }))
  }
  function setGasto(k: keyof Gastos, valor: string) {
    setD((prev) => ({ ...prev, gastos: { ...prev.gastos, [k]: valor } }))
  }
  function setVuelos(v: Vuelo[]) {
    setD((prev) => ({ ...prev, vuelos: v }))
  }

  const preview = useMemo(() => {
    const t: Trabajo = {
      ...d,
      id: '',
      loteId,
      updatedAt: '',
      deleted: false,
    }
    return { costo: costoTotal(t), mg: margen(t), mgHa: margenHa(t) }
  }, [d, loteId])

  async function guardar() {
    if (guardando) return
    setGuardando(true)
    await guardarTrabajo(loteId, trabajoId, d)
    onCerrar()
  }

  if (!lote) return null

  return (
    <>
      <div className="p-cabeza">
        <div>
          <h2>{previo ? 'Editar trabajo' : 'Cargar trabajo'}</h2>
          <div className="meta">{lote.nombre}</div>
        </div>
        <button className="cerrar" onClick={onCerrar} aria-label="Cancelar">
          ✕
        </button>
      </div>

      <div className="p-cuerpo">
        <div className="form-grid">
          <div className="campo">
            <label htmlFor="t-fecha">Fecha</label>
            <input
              id="t-fecha"
              type="date"
              value={d.fecha}
              onChange={(e) => set('fecha', e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="t-tipo">Tipo</label>
            <select
              id="t-tipo"
              value={d.tipo}
              onChange={(e) => set('tipo', e.target.value as TipoTrabajo)}
            >
              {TIPOS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="t-cultivo">Cultivo</label>
            <input
              id="t-cultivo"
              value={d.cultivo}
              onChange={(e) => set('cultivo', e.target.value)}
              placeholder="Soja, trigo, pastura…"
            />
          </div>
          <div className="campo">
            <label htmlFor="t-ha">Superficie aplicada (ha)</label>
            <input
              id="t-ha"
              inputMode="decimal"
              value={d.ha}
              onChange={(e) => set('ha', e.target.value)}
            />
          </div>
          <div className="campo ancho">
            <label htmlFor="t-producto">Producto</label>
            <input
              id="t-producto"
              value={d.producto}
              onChange={(e) => set('producto', e.target.value)}
              placeholder="Togar Max + Rizospray Integrum"
            />
          </div>
          <div className="campo">
            <label htmlFor="t-dosis">Dosis</label>
            <input
              id="t-dosis"
              value={d.dosis}
              onChange={(e) => set('dosis', e.target.value)}
              placeholder="1,2 l/ha"
            />
          </div>
          <div className="campo">
            <label htmlFor="t-clima">Condiciones</label>
            <input
              id="t-clima"
              value={d.condiciones}
              onChange={(e) => set('condiciones', e.target.value)}
              placeholder="22°C, 8 km/h SE"
            />
          </div>

          <div className="separador">Registro de vuelos</div>
          <RegistroVuelos vuelos={d.vuelos} onChange={setVuelos} />

          {d.vuelos.length === 0 && (
            <>
              <div className="separador">Totales (si no cargás vuelo por vuelo)</div>
              <div className="campo">
                <label htmlFor="t-min">Minutos de vuelo</label>
                <input
                  id="t-min"
                  inputMode="decimal"
                  value={d.minutos}
                  onChange={(e) => set('minutos', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="campo">
                <label htmlFor="t-lt">Litros de caldo</label>
                <input
                  id="t-lt"
                  inputMode="decimal"
                  value={d.litros}
                  onChange={(e) => set('litros', e.target.value)}
                  placeholder="0"
                />
              </div>
            </>
          )}

          <div className="separador">
            Plata (esto no sale en el informe del cliente)
          </div>
          <div className="campo">
            <label htmlFor="t-fact">Facturado</label>
            <input
              id="t-fact"
              inputMode="decimal"
              value={d.facturado}
              onChange={(e) => set('facturado', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="campo">
            <label htmlFor="t-q">Químico</label>
            <input
              id="t-q"
              inputMode="decimal"
              value={d.gastos.quimico}
              onChange={(e) => setGasto('quimico', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="campo">
            <label htmlFor="t-cb">Combustible</label>
            <input
              id="t-cb"
              inputMode="decimal"
              value={d.gastos.combustible}
              onChange={(e) => setGasto('combustible', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="campo">
            <label htmlFor="t-vi">Viáticos</label>
            <input
              id="t-vi"
              inputMode="decimal"
              value={d.gastos.viaticos}
              onChange={(e) => setGasto('viaticos', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="campo ancho">
            <label htmlFor="t-ot">Otros gastos</label>
            <input
              id="t-ot"
              inputMode="decimal"
              value={d.gastos.otros}
              onChange={(e) => setGasto('otros', e.target.value)}
              placeholder="0"
            />
          </div>

          <div id="preview">
            <div>
              <span>gastos</span>
              <b className="num">{plata(preview.costo)}</b>
            </div>
            <div>
              <span>margen</span>
              <b className={'num ' + (preview.mg >= 0 ? 'pos' : 'neg')}>
                {plata(preview.mg)}
              </b>
            </div>
            <div>
              <span>margen por ha</span>
              <b className={'num ' + (preview.mgHa >= 0 ? 'pos' : 'neg')}>
                {plata(preview.mgHa)}
              </b>
            </div>
          </div>
        </div>

        <div className="acciones">
          <button className="btn-cancelar" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            className="btn-guardar"
            onClick={guardar}
            disabled={guardando}
          >
            Guardar trabajo
          </button>
        </div>
      </div>
    </>
  )
}
