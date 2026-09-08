/** Vista "Números": totales de la temporada y ranking de margen por hectárea. */

import type { ChangeEvent } from 'react'
import { useBitacora } from '../datos/bitacora-context'
import {
  caudalReal,
  costoTotal,
  haTrabajo,
  litrosTrabajo,
  margenHa,
  minTrabajo,
  vuelosValidos,
} from '../lib/calculos'
import { fechaCorta, n2, nha, num, numeroTexto, plata } from '../lib/formato'
import { unidadesDe } from '../lib/unidades'

function BloqueDatos({
  onExportar,
  onImportar,
}: {
  onExportar: () => void
  onImportar: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 14,
        borderTop: '1px solid var(--linea)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <button className="fab sec" style={{ width: '100%' }} onClick={onExportar}>
        Exportar copia de seguridad (.json)
      </button>
      <label className="fab sec" style={{ width: '100%', textAlign: 'center' }}>
        Importar copia
        <input
          type="file"
          accept="application/json,.json"
          onChange={onImportar}
          style={{ display: 'none' }}
        />
      </label>
      <div className="aviso" style={{ marginTop: 4 }}>
        <b>Instalar en el iPhone:</b> abrí esta página en Safari, tocá Compartir y
        elegí <b>Añadir a pantalla de inicio</b>. Después abre sin señal.
      </div>
    </div>
  )
}

export function Resumen({ onVolver }: { onVolver: () => void }) {
  const { lotes, trabajos, exportarBackup, importarBackup } = useBitacora()

  async function onImportar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await importarBackup(file)
      window.alert('Copia importada.')
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'No se pudo leer el archivo.',
      )
    }
  }

  if (trabajos.length === 0) {
    return (
      <>
        <div className="p-cabeza">
          <div>
            <h2>Números</h2>
            <div className="meta">sin datos todavía</div>
          </div>
          <button className="cerrar" onClick={onVolver} aria-label="Volver">
            ✕
          </button>
        </div>
        <div className="p-cuerpo">
          <div className="vacio">
            Cargá algunos trabajos y acá te aparece cuánto te deja cada uno por
            hectárea, y cuáles te conviene repetir.
          </div>
          <BloqueDatos onExportar={exportarBackup} onImportar={onImportar} />
        </div>
      </>
    )
  }

  const haT = trabajos.reduce((s, t) => s + haTrabajo(t), 0)
  const factT = trabajos.reduce((s, t) => s + num(t.facturado), 0)
  const gastoT = trabajos.reduce((s, t) => s + costoTotal(t), 0)
  const batT = trabajos.reduce((s, t) => s + vuelosValidos(t).length, 0)
  const minT = trabajos.reduce((s, t) => s + minTrabajo(t), 0)
  const mgT = factT - gastoT

  const ranking = trabajos
    .map((t) => {
      const l = lotes.find((x) => x.id === t.loteId)
      return {
        nom: `${l ? l.nombre : '?'} · ${fechaCorta(t.fecha)}`,
        v: margenHa(t),
      }
    })
    .sort((a, b) => b.v - a.v)
  const max = Math.max(...ranking.map((x) => Math.abs(x.v)), 1)

  function exportarCSV() {
    const filas: (string | number)[][] = [
      [
        'fecha', 'lote', 'establecimiento', 'tipo', 'cultivo', 'ha', 'producto',
        'dosis', 'dosis_unidad', 'caudal_real', 'cantidad', 'cantidad_unidad',
        'vuelos', 'minutos', 'facturado',
        'quimico', 'combustible', 'viaticos', 'otros', 'margen', 'margen_ha',
      ],
    ]
    trabajos.forEach((t) => {
      const l = lotes.find((x) => x.id === t.loteId)
      const g = t.gastos
      const u = unidadesDe(t.tipo)
      const dosisN = numeroTexto(t.dosis)
      filas.push([
        t.fecha, l?.nombre ?? '', l?.establecimiento ?? '', t.tipo, t.cultivo,
        nha(haTrabajo(t)), u.producto ? t.producto : '',
        u.dosis && dosisN ? n2(num(dosisN)) : '', u.dosis ? u.dosisUnidad : '',
        u.caudal ? n2(caudalReal(t)) : '',
        u.insumo ? n2(litrosTrabajo(t)) : '', u.insumo ? u.insumoColumna : '',
        vuelosValidos(t).length, minTrabajo(t), t.facturado,
        g.quimico, g.combustible, g.viaticos, g.otros,
        Math.round(num(t.facturado) - costoTotal(t)), Math.round(margenHa(t)),
      ])
    })
    const csv = filas
      .map((r) =>
        r
          .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(
      new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }),
    )
    a.download = 'condor-trabajos.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <div className="p-cabeza">
        <div>
          <h2>Números</h2>
          <div className="meta">{trabajos.length} trabajos cargados</div>
        </div>
        <button className="cerrar" onClick={onVolver} aria-label="Volver">
          ✕
        </button>
      </div>

      <div className="p-cuerpo">
        <div className="tarjetas">
          <div>
            <b className="num">{nha(haT)}</b>
            <span>hectáreas</span>
          </div>
          <div>
            <b className="num">{plata(factT)}</b>
            <span>facturado</span>
          </div>
          <div>
            <b className={'num ' + (mgT >= 0 ? 'pos' : 'neg')}>{plata(mgT)}</b>
            <span>margen</span>
          </div>
          <div>
            <b className={'num ' + (mgT >= 0 ? 'pos' : 'neg')}>
              {plata(haT > 0 ? mgT / haT : 0)}
            </b>
            <span>margen por ha</span>
          </div>
        </div>

        <div className="tarjetas" style={{ marginBottom: 20 }}>
          <div>
            <b className="num">{batT > 0 ? nha(haT / batT) : '—'}</b>
            <span>ha por batería</span>
          </div>
          <div>
            <b className="num">{minT > 0 ? nha(haT / (minT / 60)) : '—'}</b>
            <span>ha por hora de vuelo</span>
          </div>
          <div>
            <b className="num">{batT}</b>
            <span>vuelos registrados</span>
          </div>
        </div>

        <div className="rank">
          <h3>Margen por hectárea, trabajo por trabajo</h3>
          {ranking.map((x, i) => (
            <div className="rank-fila" key={i}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="r-nom">{x.nom}</div>
                <div
                  className="barra-mini"
                  style={{
                    width: `${Math.max(2, (Math.abs(x.v) / max) * 100)}%`,
                    background: x.v >= 0 ? '#8fc07a' : '#e0705e',
                  }}
                />
              </div>
              <div className={'r-val num ' + (x.v >= 0 ? 'pos' : 'neg')}>
                {plata(x.v)}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 20,
            paddingTop: 14,
            borderTop: '1px solid var(--linea)',
          }}
        >
          <button
            className="fab sec"
            style={{ width: '100%' }}
            onClick={exportarCSV}
          >
            Descargar todo en CSV
          </button>
        </div>

        <BloqueDatos onExportar={exportarBackup} onImportar={onImportar} />
      </div>
    </>
  )
}
