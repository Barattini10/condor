/** Lista de productos de la mezcla aplicada, con dosis, unidad y total. */

import type { ProductoAplicado } from '../tipos'
import type { UnidadesTrabajo } from '../lib/unidades'
import { totalProducto } from '../lib/productos'
import { n2 } from '../lib/formato'

export function RegistroProductos({
  productos,
  unidades,
  ha,
  onChange,
}: {
  productos: ProductoAplicado[]
  unidades: UnidadesTrabajo
  /** Superficie aplicada del trabajo, para calcular el total de cada producto. */
  ha: number
  onChange: (p: ProductoAplicado[]) => void
}) {
  function set(i: number, campo: keyof ProductoAplicado, valor: string) {
    const copia = productos.slice()
    copia[i] = { ...copia[i], [campo]: valor }
    onChange(copia)
  }
  function agregar() {
    onChange([
      ...productos,
      { nombre: '', dosis: '', unidad: unidades.dosisUnidadPorDefecto },
    ])
  }
  function quitar(i: number) {
    onChange(productos.filter((_, j) => j !== i))
  }

  function textoTotal(p: ProductoAplicado): string {
    const { valor, unidad, equivalente } = totalProducto(ha, p)
    if (!valor) return '—'
    const base = `${n2(valor)} ${unidad}`
    return equivalente
      ? `${base} (${n2(equivalente.valor)} ${equivalente.unidad})`
      : base
  }

  return (
    <div id="productos-caja">
      {productos.map((p, i) => (
        <div className="producto-fila" key={i}>
          <div className="producto-top">
            <input
              value={p.nombre}
              onChange={(e) => set(i, 'nombre', e.target.value)}
              placeholder="Nombre del producto"
            />
            <button
              className="quitar"
              onClick={() => quitar(i)}
              aria-label="Quitar producto"
            >
              ×
            </button>
          </div>
          <div className="producto-datos">
            <input
              inputMode="decimal"
              placeholder="Dosis"
              value={p.dosis}
              onChange={(e) => set(i, 'dosis', e.target.value)}
            />
            <select
              value={p.unidad}
              onChange={(e) => set(i, 'unidad', e.target.value)}
            >
              {unidades.unidadesDosis.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
            <div className="producto-total">
              <span>total</span>
              <b className="num">{textoTotal(p)}</b>
            </div>
          </div>
        </div>
      ))}

      <button
        className="mini"
        style={{ marginTop: productos.length ? 10 : 0, width: '100%' }}
        onClick={agregar}
      >
        + Agregar producto
      </button>
    </div>
  )
}
