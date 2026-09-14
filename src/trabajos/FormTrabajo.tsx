/** Alta y edición de un trabajo, con su registro de vuelos y sus números. */

import { useMemo, useState } from 'react'
import { useBitacora, type DatosTrabajo } from '../datos/bitacora-context'
import type { Gastos, TipoTrabajo, Trabajo, Vuelo } from '../tipos'
import { costoTotal, margen, margenHa } from '../lib/calculos'
import { EQUIPOS, EQUIPO_POR_DEFECTO } from '../lib/equipos'
import { hoyISO, num, numeroTexto, plata } from '../lib/formato'
import { unidadesDe } from '../lib/unidades'
import { RegistroVuelos } from './RegistroVuelos'

const TIPOS: TipoTrabajo[] = [
  'Pulverización',
  'Siembra',
  'Fertilización',
  'Mapeo',
]

/** El Mavic 3M solo mapea; el resto de los equipos, todo salvo Mapeo. */
const TIPOS_SIN_MAPEO: TipoTrabajo[] = TIPOS.filter((t) => t !== 'Mapeo')

const BATERIAS_POR_DEFECTO = '3'

function gastosVacios(): Gastos {
  return {
    quimico: '',
    combustible: '',
    viaticos: '',
    otros: '',
    kilometrosRecorridos: '',
    litrosNafta: '',
  }
}

function datosIniciales(lote: { ha: number }, previo: Trabajo | undefined): DatosTrabajo {
  if (previo) {
    return {
      fecha: previo.fecha,
      tipo: previo.tipo,
      cultivo: previo.cultivo,
      equipo: previo.equipo || EQUIPO_POR_DEFECTO,
      producto: previo.producto,
      dosis: numeroTexto(previo.dosis),
      condiciones: previo.condiciones,
      baterias: previo.baterias || BATERIAS_POR_DEFECTO,
      ha: previo.ha,
      minutos: previo.minutos,
      litros: previo.litros,
      vuelos: previo.vuelos.map((v) => ({ ...v })),
      // { ...vacíos, ...previo } por si el trabajo es viejo y no tiene los
      // campos informativos nuevos (quedan '' en vez de undefined).
      gastos: { ...gastosVacios(), ...previo.gastos },
      facturado: previo.facturado,
    }
  }
  return {
    fecha: hoyISO(),
    tipo: 'Pulverización',
    cultivo: '',
    equipo: EQUIPO_POR_DEFECTO,
    producto: '',
    dosis: '',
    condiciones: '',
    baterias: BATERIAS_POR_DEFECTO,
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

  const u = unidadesDe(d.tipo)
  const nBaterias = Math.max(1, Math.round(num(d.baterias)) || 3)

  const esMavic = d.equipo === 'Mavic 3M'
  const tiposDisponibles = esMavic ? ['Mapeo' as const] : TIPOS_SIN_MAPEO

  function set<K extends keyof DatosTrabajo>(campo: K, valor: DatosTrabajo[K]) {
    setD((prev) => ({ ...prev, [campo]: valor }))
  }
  function setGasto(k: keyof Gastos, valor: string) {
    setD((prev) => ({ ...prev, gastos: { ...prev.gastos, [k]: valor } }))
  }
  function setVuelos(v: Vuelo[]) {
    setD((prev) => ({ ...prev, vuelos: v }))
  }
  function cambiarEquipo(nuevoEquipo: string) {
    setD((prev) => {
      let tipo = prev.tipo
      if (nuevoEquipo === 'Mavic 3M') {
        // El Mavic solo mapea.
        tipo = 'Mapeo'
      } else if (tipo === 'Mapeo') {
        // El equipo nuevo no mapea: hay que salir de "Mapeo" sí o sí.
        tipo = TIPOS_SIN_MAPEO[0]
      }
      return { ...prev, equipo: nuevoEquipo, tipo }
    })
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
    // Producto y Dosis NO se borran aunque el tipo actual los oculte: si
    // cambiás de equipo/tipo y volvés, quedan como estaban. La dosis sí se
    // normaliza a número limpio. El total manual de insumo sigue
    // limpiándose cuando el tipo no lo usa (litros de Mapeo no aplican).
    const limpio: DatosTrabajo = {
      ...d,
      dosis: numeroTexto(d.dosis),
      litros: u.insumo ? d.litros : '',
    }
    await guardarTrabajo(loteId, trabajoId, limpio)
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
              disabled={esMavic}
            >
              {tiposDisponibles.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="t-equipo">Equipo</label>
            <select
              id="t-equipo"
              value={d.equipo}
              onChange={(e) => cambiarEquipo(e.target.value)}
            >
              {EQUIPOS.map((o) => (
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
          {u.producto && (
            <div className="campo ancho">
              <label htmlFor="t-producto">Producto</label>
              <input
                id="t-producto"
                value={d.producto}
                onChange={(e) => set('producto', e.target.value)}
                placeholder="Togar Max + Rizospray Integrum"
              />
            </div>
          )}
          {u.dosis && (
            <div className="campo">
              <label htmlFor="t-dosis">Dosis</label>
              <div className="con-unidad">
                <input
                  id="t-dosis"
                  inputMode="decimal"
                  value={d.dosis}
                  onChange={(e) => set('dosis', e.target.value)}
                  placeholder="0"
                />
                <span>{u.dosisUnidad}</span>
              </div>
            </div>
          )}
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
          <div className="campo">
            <label htmlFor="t-bat">Cantidad de baterías</label>
            <input
              id="t-bat"
              inputMode="numeric"
              value={d.baterias}
              onChange={(e) => set('baterias', e.target.value)}
              placeholder="3"
            />
          </div>
          <RegistroVuelos
            vuelos={d.vuelos}
            unidades={u}
            baterias={nBaterias}
            onChange={setVuelos}
          />

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
              {u.insumo && (
                <div className="campo">
                  <label htmlFor="t-lt">{u.insumoManualLabel}</label>
                  <input
                    id="t-lt"
                    inputMode="decimal"
                    value={d.litros}
                    onChange={(e) => set('litros', e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
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

          <div className="separador">
            Datos informativos (no afectan el margen)
          </div>
          <div className="campo">
            <label htmlFor="t-km">Kilómetros recorridos</label>
            <input
              id="t-km"
              inputMode="decimal"
              value={d.gastos.kilometrosRecorridos}
              onChange={(e) => setGasto('kilometrosRecorridos', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="campo">
            <label htmlFor="t-ln">Litros de nafta (grupos)</label>
            <input
              id="t-ln"
              inputMode="decimal"
              value={d.gastos.litrosNafta}
              onChange={(e) => setGasto('litrosNafta', e.target.value)}
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
