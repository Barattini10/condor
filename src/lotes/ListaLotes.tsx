/** Vista inicial del panel: la lista de todos los lotes. */

import { useBitacora } from '../datos/bitacora-context'
import { haTrabajo, margen } from '../lib/calculos'
import { nha, plata } from '../lib/formato'

export function ListaLotes({
  onAbrirLote,
}: {
  onAbrirLote: (id: string) => void
}) {
  const { lotes, trabajos } = useBitacora()

  const haTot = trabajos.reduce((s, t) => s + haTrabajo(t), 0)

  return (
    <>
      <div className="p-cabeza">
        <div>
          <h2>Lotes</h2>
          <div className="meta">
            {lotes.length} {lotes.length === 1 ? 'lote' : 'lotes'} · {nha(haTot)} ha
            trabajadas
          </div>
        </div>
      </div>
      <div className="p-cuerpo">
        {lotes.length === 0 ? (
          <>
            <div className="aviso">
              Todavía no hay ningún lote. Tocá <b>+ Lote</b>, movete en el mapa
              hasta el campo y marcá las esquinas.
            </div>
            <div className="vacio">
              Después le cargás cada trabajo con el registro de vuelos batería por
              batería, y de ahí sale el informe para el cliente.
            </div>
          </>
        ) : (
          lotes.map((l) => {
            const ts = trabajos.filter((t) => t.loteId === l.id)
            const mg = ts.reduce((s, t) => s + margen(t), 0)
            const hh = ts.reduce((s, t) => s + haTrabajo(t), 0)
            return (
              <div
                key={l.id}
                className="lote-item"
                onClick={() => onAbrirLote(l.id)}
              >
                <div
                  className="pip"
                  style={{ background: ts.length ? '#8fc07a' : '#4a5544' }}
                />
                <div>
                  <div className="nom">{l.nombre}</div>
                  <div className="est">
                    {l.establecimiento || 'Sin establecimiento'} · {nha(l.ha)} ha
                  </div>
                </div>
                <div className="der">
                  {ts.length ? (
                    <>
                      <b className={'num ' + (mg >= 0 ? 'pos' : 'neg')}>
                        {plata(hh > 0 ? mg / hh : 0)}
                      </b>
                      <span>
                        margen/ha · {ts.length}{' '}
                        {ts.length === 1 ? 'trabajo' : 'trabajos'}
                      </span>
                    </>
                  ) : (
                    <>
                      <b className="num" style={{ color: '#9aa593' }}>
                        —
                      </b>
                      <span>sin trabajos</span>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
