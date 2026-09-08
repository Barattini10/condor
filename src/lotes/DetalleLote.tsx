/** Panel de un lote: sus números y la lista de trabajos hechos ahí. */

import { useBitacora } from '../datos/bitacora-context'
import {
  caudalReal,
  costoTotal,
  haTrabajo,
  margen,
  margenHa,
  minTrabajo,
  vuelosValidos,
} from '../lib/calculos'
import { fechaCorta, n2, nha, num, plata, tiempo } from '../lib/formato'

export function DetalleLote({
  loteId,
  onVolver,
  onNuevoTrabajo,
  onEditarTrabajo,
  onVerInforme,
}: {
  loteId: string
  onVolver: () => void
  onNuevoTrabajo: () => void
  onEditarTrabajo: (trabajoId: string) => void
  onVerInforme: (trabajoId: string) => void
}) {
  const { lotePorId, trabajosDeLote, borrarTrabajo, borrarLote } = useBitacora()
  const lote = lotePorId(loteId)
  if (!lote) return null

  const ts = trabajosDeLote(loteId)
    .slice()
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  const haT = ts.reduce((s, t) => s + haTrabajo(t), 0)
  const factT = ts.reduce((s, t) => s + num(t.facturado), 0)
  const mgT = ts.reduce((s, t) => s + margen(t), 0)

  async function onBorrarTrabajo(id: string) {
    if (!window.confirm('¿Borrar este trabajo?')) return
    await borrarTrabajo(id)
  }

  async function onBorrarLote() {
    if (
      !window.confirm(
        'Se borra el lote y todos sus trabajos. ¿Seguro?',
      )
    )
      return
    await borrarLote(loteId)
    onVolver()
  }

  return (
    <>
      <div className="p-cabeza">
        <div>
          <h2>{lote.nombre}</h2>
          <div className="meta">
            {lote.establecimiento || 'Sin establecimiento'} · {nha(lote.ha)} ha
          </div>
        </div>
        <button className="cerrar" onClick={onVolver} aria-label="Volver">
          ✕
        </button>
      </div>

      <div className="p-cuerpo">
        {ts.length > 0 && (
          <div className="tarjetas">
            <div>
              <b className="num">{nha(haT)}</b>
              <span>ha aplicadas</span>
            </div>
            <div>
              <b className="num">{plata(factT)}</b>
              <span>facturado</span>
            </div>
            <div>
              <b className={'num ' + (mgT >= 0 ? 'pos' : 'neg')}>
                {plata(haT > 0 ? mgT / haT : 0)}
              </b>
              <span>margen por ha</span>
            </div>
          </div>
        )}

        <button
          className="fab"
          style={{ width: '100%', marginBottom: 16 }}
          onClick={onNuevoTrabajo}
        >
          + Cargar trabajo
        </button>

        {ts.length === 0 ? (
          <div className="vacio">
            Este lote todavía no tiene trabajos cargados.
          </div>
        ) : (
          ts.map((t) => {
            const vs = vuelosValidos(t)
            const h = haTrabajo(t)
            const m = minTrabajo(t)
            const mg = margen(t)
            const cr = caudalReal(t)

            const d1: string[] = []
            if (t.cultivo) d1.push(t.cultivo)
            if (t.producto) d1.push(t.producto + (t.dosis ? ' · ' + t.dosis : ''))

            const d2: string[] = [nha(h) + ' ha']
            if (vs.length) d2.push(vs.length + ' vuelos')
            if (m) d2.push(tiempo(m))
            if (cr) d2.push(n2(cr) + ' l/ha')
            if (h && m) d2.push(nha(h / (m / 60)) + ' ha/h')

            return (
              <div key={t.id} className="trabajo">
                <div className="top">
                  <span className="fecha num">{fechaCorta(t.fecha)}</span>
                  <span className="tipo">{t.tipo}</span>
                </div>
                <div className="detalle">
                  {d1.length > 0 && (
                    <>
                      {d1.join(' · ')}
                      <br />
                    </>
                  )}
                  {d2.join(' · ')}
                </div>
                <div className="plata">
                  <div>
                    <span>facturado</span>
                    <b className="num">{plata(num(t.facturado))}</b>
                  </div>
                  <div>
                    <span>gastos</span>
                    <b className="num">{plata(costoTotal(t))}</b>
                  </div>
                  <div>
                    <span>margen/ha</span>
                    <b className={'num ' + (mg >= 0 ? 'pos' : 'neg')}>
                      {plata(margenHa(t))}
                    </b>
                  </div>
                </div>
                <div className="pie">
                  <button className="mini" onClick={() => onVerInforme(t.id)}>
                    Informe
                  </button>
                  <button className="mini" onClick={() => onEditarTrabajo(t.id)}>
                    Editar
                  </button>
                  <button
                    className="mini roja"
                    onClick={() => onBorrarTrabajo(t.id)}
                  >
                    borrar
                  </button>
                </div>
              </div>
            )
          })
        )}

        <div
          style={{
            marginTop: 8,
            paddingTop: 12,
            borderTop: '1px solid var(--linea)',
          }}
        >
          <button className="mini roja" onClick={onBorrarLote}>
            Borrar este lote
          </button>
        </div>
      </div>
    </>
  )
}
