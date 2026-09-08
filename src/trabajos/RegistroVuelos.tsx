/** Tabla de vuelos batería por batería, dentro del formulario de trabajo. */

import type { Vuelo } from '../tipos'
import { n2, nha, num, tiempo } from '../lib/formato'

export function RegistroVuelos({
  vuelos,
  onChange,
}: {
  vuelos: Vuelo[]
  onChange: (v: Vuelo[]) => void
}) {
  function set(i: number, campo: keyof Vuelo, valor: string) {
    const copia = vuelos.slice()
    copia[i] = { ...copia[i], [campo]: valor }
    onChange(copia)
  }
  function agregar() {
    onChange([
      ...vuelos,
      { bateria: String(vuelos.length + 1), ha: '', min: '', litros: '' },
    ])
  }
  function quitar(i: number) {
    onChange(vuelos.filter((_, j) => j !== i))
  }

  const ha = vuelos.reduce((s, v) => s + num(v.ha), 0)
  const mi = vuelos.reduce((s, v) => s + num(v.min), 0)
  const li = vuelos.reduce((s, v) => s + num(v.litros), 0)

  return (
    <div id="vuelos-caja">
      <div className="vuelos-encabezado">
        <div />
        <div>batería</div>
        <div>ha</div>
        <div>min</div>
        <div>litros</div>
        <div />
      </div>

      <div id="vuelos-lista">
        {vuelos.map((v, i) => (
          <div className="vuelo-fila" key={i}>
            <div className="idx">{i + 1}</div>
            <input
              value={v.bateria}
              onChange={(e) => set(i, 'bateria', e.target.value)}
            />
            <input
              inputMode="decimal"
              placeholder="ha"
              value={v.ha}
              onChange={(e) => set(i, 'ha', e.target.value)}
            />
            <input
              inputMode="decimal"
              placeholder="min"
              value={v.min}
              onChange={(e) => set(i, 'min', e.target.value)}
            />
            <input
              inputMode="decimal"
              placeholder="l"
              value={v.litros}
              onChange={(e) => set(i, 'litros', e.target.value)}
            />
            <button
              className="quitar"
              onClick={() => quitar(i)}
              aria-label="Quitar vuelo"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        className="mini"
        style={{ marginTop: 6, width: '100%' }}
        onClick={agregar}
      >
        + Agregar vuelo
      </button>

      <div className="vuelos-total">
        {vuelos.length === 0 ? (
          <div style={{ color: '#9aa593', fontSize: 12.5 }}>
            Sin vuelos cargados. Podés cargar el trabajo igual con los totales de
            abajo, pero el informe queda sin el detalle por batería.
          </div>
        ) : (
          <>
            <div>
              <span>vuelos</span>
              <b className="num">{vuelos.length}</b>
            </div>
            <div>
              <span>hectáreas</span>
              <b className="num">{nha(ha)}</b>
            </div>
            <div>
              <span>tiempo</span>
              <b className="num">{tiempo(mi)}</b>
            </div>
            <div>
              <span>caudal real</span>
              <b className="num">
                {ha > 0 && li > 0 ? n2(li / ha) + ' l/ha' : '—'}
              </b>
            </div>
            <div>
              <span>ha por batería</span>
              <b className="num">{nha(ha / vuelos.length)}</b>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
