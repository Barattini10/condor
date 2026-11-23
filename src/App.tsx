/** Armado general: barra, mapa, panel inferior y visor del informe. */

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import './App.css'
import type { PuntoLatLng } from './tipos'
import { useBitacora } from './datos/bitacora-context'
import { haTrabajo } from './lib/calculos'
import { agruparPorEquipo, nombreCortoEquipo } from './lib/equipos'
import { nha } from './lib/formato'
import { Mapa, type MapaHandle } from './mapa/Mapa'
import type { ProgresoDescarga } from './mapa/tilesOffline'
import { resolverUbicacion, type MotivoFallo } from './lib/ubicacion'
import { ListaLotes } from './lotes/ListaLotes'
import { DetalleLote } from './lotes/DetalleLote'
import { FormNuevoLote } from './lotes/FormNuevoLote'
import { FormTrabajo } from './trabajos/FormTrabajo'
import { Resumen } from './resumen/Resumen'
import { armarInforme, type Informe } from './informe/armarInforme'
import { VisorInforme } from './informe/VisorInforme'
import { importarArchivo } from './importar/importarArchivo'
import type { LoteImportado } from './importar/geojson'
import { ImportarLotes } from './importar/ImportarLotes'

type Vista =
  | { tipo: 'lotes' }
  | { tipo: 'detalle'; loteId: string }
  | { tipo: 'nuevoLote'; puntos: PuntoLatLng[]; ha: number }
  | { tipo: 'formTrabajo'; loteId: string; trabajoId: string | null }
  | { tipo: 'importar'; lotes: LoteImportado[]; archivo: string }
  | { tipo: 'resumen' }

function textoDibujo(puntos: number, ha: number): string {
  if (puntos === 0) return 'Tocá las esquinas del lote sobre el mapa.'
  if (puntos < 3)
    return `${puntos} punto${puntos > 1 ? 's' : ''}. Faltan ${3 - puntos} para cerrar.`
  return `${puntos} puntos · ${nha(ha)} ha`
}

const MENSAJE_FALLO_UBIC: Record<MotivoFallo, string> = {
  'sin-coords':
    'No encontré coordenadas. Pegá algo como 33°53\'09.6"S 59°30\'49.0"W, -33.8095, -59.5069, o un link de Google Maps.',
  'link-acortado':
    'No pude resolver ese link acortado. Abrilo una vez en el navegador y pegá la dirección larga, o pegá las coordenadas.',
  'sin-conexion':
    'Sin señal no puedo abrir un link acortado. Cuando tengas internet volvé a intentar, o pegá las coordenadas.',
}

export default function App() {
  const { cargando, lotes, trabajos, lotePorId, actualizarLote } = useBitacora()

  const [vista, setVista] = useState<Vista>({ tipo: 'lotes' })
  const [informe, setInforme] = useState<Informe | null>(null)
  const [modoDibujo, setModoDibujo] = useState(false)
  const [dibujo, setDibujo] = useState({ puntos: 0, ha: 0 })
  const [edicionForma, setEdicionForma] = useState<
    { loteId: string; puntos: number; ha: number } | null
  >(null)
  const [descarga, setDescarga] = useState<ProgresoDescarga | null>(null)
  const [ubicAbierto, setUbicAbierto] = useState(false)
  const [ubicTexto, setUbicTexto] = useState('')
  const [ubicError, setUbicError] = useState<string | null>(null)
  const [ubicBuscando, setUbicBuscando] = useState(false)
  const [ubicOk, setUbicOk] = useState(false)
  const [importando, setImportando] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)

  const mapaRef = useRef<MapaHandle>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  const lotesConTrabajos = useMemo(
    () => new Set(trabajos.map((t) => t.loteId)),
    [trabajos],
  )
  const haPorEquipo = useMemo(
    () =>
      agruparPorEquipo(trabajos).map((g) => ({
        equipo: g.equipo,
        ha: g.trabajos.reduce((s, t) => s + haTrabajo(t), 0),
      })),
    [trabajos],
  )

  const loteSeleccionadoId =
    'loteId' in vista ? vista.loteId : null

  const onSeleccionarLote = useCallback((id: string) => {
    setVista({ tipo: 'detalle', loteId: id })
  }, [])

  const onDibujoProgreso = useCallback(
    (info: { puntos: number; ha: number }) => {
      setDibujo(info)
      setEdicionForma((e) => (e ? { ...e, ...info } : e))
    },
    [],
  )

  const onLoteDibujado = useCallback((puntos: PuntoLatLng[], ha: number) => {
    setModoDibujo(false)
    setDibujo({ puntos: 0, ha: 0 })
    setVista({ tipo: 'nuevoLote', puntos, ha })
  }, [])

  function empezarDibujo() {
    mapaRef.current?.empezarDibujo()
    setModoDibujo(true)
  }
  function cancelarDibujo() {
    mapaRef.current?.cancelarDibujo()
    setModoDibujo(false)
    setDibujo({ puntos: 0, ha: 0 })
  }

  function empezarEdicionForma(loteId: string) {
    const lote = lotePorId(loteId)
    if (!lote) return
    mapaRef.current?.empezarEdicionForma(lote.puntos)
    setEdicionForma({ loteId, puntos: lote.puntos.length, ha: lote.ha })
  }
  function cancelarEdicionForma() {
    mapaRef.current?.cancelarEdicionForma()
    setEdicionForma(null)
  }
  async function guardarEdicionForma() {
    if (!edicionForma) return
    const r = mapaRef.current?.guardarEdicionForma()
    if (!r) return
    await actualizarLote(edicionForma.loteId, { puntos: r.puntos, ha: r.ha })
    setEdicionForma(null)
  }

  function abrirUbicacion() {
    setUbicTexto('')
    setUbicError(null)
    setUbicAbierto(true)
  }
  async function irAUbicacion() {
    if (ubicBuscando) return
    setUbicError(null)
    setUbicBuscando(true)
    const r = await resolverUbicacion(ubicTexto)
    setUbicBuscando(false)
    if (!r.ok) {
      setUbicError(MENSAJE_FALLO_UBIC[r.motivo])
      return
    }
    mapaRef.current?.irAUbicacion(r.coord)
    setUbicAbierto(false)
    setUbicOk(true)
    window.setTimeout(() => setUbicOk(false), 4000)
  }

  async function onElegirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || importando) return
    setImportando(true)
    try {
      const lotesImp = await importarArchivo(file)
      setVista({ tipo: 'importar', lotes: lotesImp, archivo: file.name })
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'No se pudo leer el archivo.',
      )
    } finally {
      setImportando(false)
    }
  }

  async function guardarMapa() {
    if (!mapaRef.current || descarga) return
    setDescarga({ hechos: 0, total: 0 })
    const r = await mapaRef.current.descargarZona((p) => setDescarga(p))
    setDescarga(r)
    window.setTimeout(() => setDescarga(null), 2500)
  }

  function verInforme(trabajoId: string) {
    const t = trabajos.find((x) => x.id === trabajoId)
    if (!t) return
    const l = lotePorId(t.loteId)
    if (!l) return
    setInforme(armarInforme(t, l))
  }

  if (cargando) {
    return (
      <div id="app">
        <div className="p-cuerpo" style={{ margin: 'auto', color: '#9aa593' }}>
          Cargando bitácora…
        </div>
      </div>
    )
  }

  return (
    <div id="app">
      <div id="barra">
        <div className="barra-fila1">
          <div>
            <h1>Cóndor Agro</h1>
            <div className="sub">Bitácora de lotes</div>
          </div>
          <div className="resumen">
            {haPorEquipo.length === 0 ? (
              <div className="resumen-item">
                <b className="num">0 ha</b>
                <span>trabajadas</span>
              </div>
            ) : (
              haPorEquipo.map((e) => (
                <div className="resumen-item" key={e.equipo}>
                  <b className="num">{nha(e.ha)} ha</b>
                  <span>{nombreCortoEquipo(e.equipo)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="barra-botones">
          <button className="fab" onClick={empezarDibujo} disabled={modoDibujo}>
            + Lote
          </button>
          <button
            className="fab sec"
            onClick={abrirUbicacion}
            disabled={ubicAbierto}
          >
            Ir a ubicación
          </button>

          <div className="menu-mas">
            <button
              className="fab sec"
              onClick={() => setMenuAbierto((v) => !v)}
            >
              ⋮ Más
            </button>
            {menuAbierto && (
              <>
                <div
                  className="menu-mas-fondo"
                  onClick={() => setMenuAbierto(false)}
                />
                <div className="menu-mas-lista">
                  <button
                    onClick={() => {
                      setMenuAbierto(false)
                      setVista({ tipo: 'resumen' })
                    }}
                  >
                    Números
                  </button>
                  <button
                    onClick={() => {
                      setMenuAbierto(false)
                      inputArchivoRef.current?.click()
                    }}
                  >
                    ⬆ Importar
                  </button>
                  <button
                    onClick={() => {
                      setMenuAbierto(false)
                      guardarMapa()
                    }}
                  >
                    ⬇ Guardar mapa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div id="wrap-mapa">
        <Mapa
          ref={mapaRef}
          lotes={lotes}
          lotesConTrabajos={lotesConTrabajos}
          loteSeleccionadoId={loteSeleccionadoId}
          loteEditandoId={edicionForma?.loteId ?? null}
          onSeleccionarLote={onSeleccionarLote}
          onDibujoProgreso={onDibujoProgreso}
          onLoteDibujado={onLoteDibujado}
        />

        <input
          ref={inputArchivoRef}
          type="file"
          accept=".kml,.kmz,.zip,.geojson,.json,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
          style={{ display: 'none' }}
          onChange={onElegirArchivo}
        />

        {importando && (
          <div id="modo-dibujo" className="on">
            <p>Leyendo el archivo…</p>
          </div>
        )}

        {ubicOk && !ubicAbierto && !modoDibujo && (
          <div id="modo-dibujo" className="on">
            <p>Marqué el punto. Tocá + Lote y marcá las esquinas del lote.</p>
          </div>
        )}

        {ubicAbierto && (
          <div id="modo-dibujo" className="on">
            <p>
              Pegá coordenadas — decimales (-33.8095, -59.5069) o grados
              (33°53'09.6"S 59°30'49.0"W) — o un link de Google Maps.
            </p>
            <input
              autoFocus
              value={ubicTexto}
              onChange={(e) => {
                setUbicTexto(e.target.value)
                setUbicError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void irAUbicacion()
              }}
              placeholder={`33°53'09.6"S 59°30'49.0"W`}
            />
            {ubicError && <div className="err">{ubicError}</div>}
            <div className="fila">
              <button
                className="fab sec"
                onClick={() => setUbicAbierto(false)}
              >
                Cancelar
              </button>
              <button
                className="fab"
                onClick={() => void irAUbicacion()}
                disabled={ubicBuscando}
              >
                {ubicBuscando ? 'Buscando…' : 'Ir'}
              </button>
            </div>
          </div>
        )}

        {descarga && (
          <div id="modo-dibujo" className="on">
            <p>
              Guardando la imagen satelital de esta zona para usar sin señal…{' '}
              {descarga.total > 0
                ? `${descarga.hechos} / ${descarga.total}`
                : ''}
            </p>
          </div>
        )}

        {modoDibujo && (
          <div id="modo-dibujo" className="on">
            <p>{textoDibujo(dibujo.puntos, dibujo.ha)}</p>
            <div className="fila">
              <button
                className="fab sec"
                onClick={() => mapaRef.current?.deshacerPunto()}
              >
                Borrar último punto
              </button>
              <button
                className="fab"
                onClick={() => mapaRef.current?.cerrarLote()}
              >
                Cerrar lote
              </button>
            </div>
            <div className="fila" style={{ marginTop: 8 }}>
              <button className="fab sec" onClick={cancelarDibujo}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {edicionForma && (
          <div id="modo-dibujo" className="on">
            <p>
              Arrastrá los puntos para ajustar el lote. Doble click en un
              punto para borrarlo. {edicionForma.puntos} puntos ·{' '}
              {nha(edicionForma.ha)} ha
            </p>
            <div className="fila">
              <button className="fab sec" onClick={cancelarEdicionForma}>
                Cancelar
              </button>
              <button className="fab" onClick={() => void guardarEdicionForma()}>
                Guardar forma
              </button>
            </div>
          </div>
        )}
      </div>

      <div id="panel" className={vista.tipo === 'lotes' ? 'chico' : undefined}>
        {vista.tipo === 'lotes' && (
          <ListaLotes onAbrirLote={onSeleccionarLote} />
        )}
        {vista.tipo === 'detalle' && (
          <DetalleLote
            loteId={vista.loteId}
            onVolver={() => {
              if (edicionForma) cancelarEdicionForma()
              setVista({ tipo: 'lotes' })
            }}
            onNuevoTrabajo={() =>
              setVista({
                tipo: 'formTrabajo',
                loteId: vista.loteId,
                trabajoId: null,
              })
            }
            onEditarTrabajo={(trabajoId) =>
              setVista({ tipo: 'formTrabajo', loteId: vista.loteId, trabajoId })
            }
            onVerInforme={verInforme}
            onEditarForma={() => empezarEdicionForma(vista.loteId)}
            editandoForma={edicionForma?.loteId === vista.loteId}
          />
        )}
        {vista.tipo === 'nuevoLote' && (
          <FormNuevoLote
            puntos={vista.puntos}
            ha={vista.ha}
            onCancelar={() => setVista({ tipo: 'lotes' })}
            onCreado={(loteId) => setVista({ tipo: 'detalle', loteId })}
          />
        )}
        {vista.tipo === 'formTrabajo' && (
          <FormTrabajo
            loteId={vista.loteId}
            trabajoId={vista.trabajoId}
            onCerrar={() =>
              setVista({ tipo: 'detalle', loteId: vista.loteId })
            }
          />
        )}
        {vista.tipo === 'importar' && (
          <ImportarLotes
            lotes={vista.lotes}
            archivo={vista.archivo}
            onCancelar={() => setVista({ tipo: 'lotes' })}
            onImportados={() => {
              if (vista.tipo === 'importar') {
                const pts = vista.lotes.flatMap((l) => l.puntos)
                mapaRef.current?.encuadrarPuntos(pts)
              }
              setVista({ tipo: 'lotes' })
            }}
          />
        )}
        {vista.tipo === 'resumen' && (
          <Resumen onVolver={() => setVista({ tipo: 'lotes' })} />
        )}
      </div>

      {informe && (
        <VisorInforme informe={informe} onCerrar={() => setInforme(null)} />
      )}
    </div>
  )
}
