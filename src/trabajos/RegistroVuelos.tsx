/** Tabla de vuelos batería por batería, dentro del formulario de trabajo. */

import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { Vuelo } from '../tipos'
import type { UnidadesTrabajo } from '../lib/unidades'
import { n2, nha, num, tiempo } from '../lib/formato'

/** Campos de la fila que participan de la navegación con Enter (batería no). */
type CampoNav = 'ha' | 'min' | 'litros'

export function RegistroVuelos({
  vuelos,
  unidades,
  baterias,
  onChange,
}: {
  vuelos: Vuelo[]
  unidades: UnidadesTrabajo
  baterias: number
  onChange: (v: Vuelo[]) => void
}) {
  const conInsumo = unidades.insumo
  const nBat = baterias > 0 ? baterias : 3

  // Referencias a los inputs de cada fila, para poder enfocarlos con Enter.
  const inputsRef = useRef<Map<string, HTMLInputElement>>(new Map())
  // Cuando Enter en la última fila agrega una nueva, hay que esperar a que
  // React la renderice antes de poder enfocarla.
  const enfocarFilaNuevaRef = useRef(false)

  function refCampo(i: number, campo: CampoNav) {
    return (el: HTMLInputElement | null) => {
      const clave = `${i}-${campo}`
      if (el) inputsRef.current.set(clave, el)
      else inputsRef.current.delete(clave)
    }
  }
  function enfocar(i: number, campo: CampoNav) {
    inputsRef.current.get(`${i}-${campo}`)?.focus()
  }

  useEffect(() => {
    if (enfocarFilaNuevaRef.current) {
      enfocarFilaNuevaRef.current = false
      enfocar(vuelos.length - 1, 'ha')
    }
  }, [vuelos.length])

  function irAFilaSiguienteOAgregar(i: number) {
    if (i + 1 < vuelos.length) {
      enfocar(i + 1, 'ha')
    } else {
      enfocarFilaNuevaRef.current = true
      agregar()
    }
  }

  function manejarEnter(
    e: KeyboardEvent<HTMLInputElement>,
    i: number,
    campo: CampoNav,
  ) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (campo === 'ha') {
      enfocar(i, 'min')
    } else if (campo === 'min' && conInsumo) {
      enfocar(i, 'litros')
    } else {
      // 'litros', o 'min' cuando el tipo no tiene columna de insumo (Mapeo).
      irAFilaSiguienteOAgregar(i)
    }
  }

  /** Nº de batería sugerido para el vuelo en la posición i (0-based). */
  const bateriaCiclo = (i: number) => String((i % nBat) + 1)

  function set(i: number, campo: keyof Vuelo, valor: string) {
    const copia = vuelos.slice()
    copia[i] = { ...copia[i], [campo]: valor }
    onChange(copia)
  }
  function agregar() {
    // Batería vacía = seguir el ciclo automático (1,2,3,1,2,3…).
    onChange([...vuelos, { bateria: '', ha: '', min: '', litros: '' }])
  }
  function quitar(i: number) {
    onChange(vuelos.filter((_, j) => j !== i))
  }

  const ha = vuelos.reduce((s, v) => s + num(v.ha), 0)
  const mi = vuelos.reduce((s, v) => s + num(v.min), 0)
  const li = vuelos.reduce((s, v) => s + num(v.litros), 0)

  const clase = conInsumo ? '' : ' sin-insumo'

  return (
    <div id="vuelos-caja">
      <div className={'vuelos-encabezado' + clase}>
        <div />
        <div>batería</div>
        <div>ha</div>
        <div>min</div>
        {conInsumo && <div>{unidades.insumoColumna}</div>}
        <div />
      </div>

      <div id="vuelos-lista">
        {vuelos.map((v, i) => (
          <div className={'vuelo-fila' + clase} key={i}>
            <div className="idx">{i + 1}</div>
            <input
              value={v.bateria || bateriaCiclo(i)}
              onChange={(e) => set(i, 'bateria', e.target.value)}
            />
            <input
              ref={refCampo(i, 'ha')}
              inputMode="decimal"
              placeholder="ha"
              value={v.ha}
              onChange={(e) => set(i, 'ha', e.target.value)}
              onKeyDown={(e) => manejarEnter(e, i, 'ha')}
            />
            <input
              ref={refCampo(i, 'min')}
              inputMode="decimal"
              placeholder="min"
              value={v.min}
              onChange={(e) => set(i, 'min', e.target.value)}
              onKeyDown={(e) => manejarEnter(e, i, 'min')}
            />
            {conInsumo && (
              <input
                ref={refCampo(i, 'litros')}
                inputMode="decimal"
                placeholder={unidades.insumoColumna}
                value={v.litros}
                onChange={(e) => set(i, 'litros', e.target.value)}
                onKeyDown={(e) => manejarEnter(e, i, 'litros')}
              />
            )}
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
            {conInsumo && (
              <div>
                <span>{unidades.insumoTotal}</span>
                <b className="num">{li > 0 ? n2(li) : '—'}</b>
              </div>
            )}
            {unidades.caudal && (
              <div>
                <span>caudal real</span>
                <b className="num">
                  {ha > 0 && li > 0 ? n2(li / ha) + ' ' + unidades.caudalUnidad : '—'}
                </b>
              </div>
            )}
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
