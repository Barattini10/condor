/** Capturas del mapa de vuelo adjuntas a un trabajo: agregar, ver, sacar. */

import { useRef, useState, type ChangeEvent } from 'react'
import type { ImagenAdjunta } from '../tipos'
import { procesarImagen } from '../lib/imagenes'

export function RegistroImagenes({
  imagenes,
  onChange,
}: {
  imagenes: ImagenAdjunta[]
  onChange: (imgs: ImagenAdjunta[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onElegir(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setError(null)
    setProcesando(true)
    try {
      const nuevas = await Promise.all(files.map(procesarImagen))
      onChange([...imagenes, ...nuevas])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo procesar la imagen.',
      )
    } finally {
      setProcesando(false)
    }
  }

  function quitar(i: number) {
    onChange(imagenes.filter((_, j) => j !== i))
  }

  return (
    <div id="imagenes-caja">
      {imagenes.length > 0 && (
        <div className="imagenes-lista">
          {imagenes.map((img, i) => (
            <div className="imagen-item" key={i}>
              <img src={img.src} alt={`Mapa de vuelo ${i + 1}`} />
              <button
                className="quitar"
                onClick={() => quitar(i)}
                aria-label="Quitar imagen"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={onElegir}
      />
      <button
        className="mini"
        style={{ marginTop: imagenes.length ? 10 : 0, width: '100%' }}
        onClick={() => inputRef.current?.click()}
        disabled={procesando}
      >
        {procesando ? 'Procesando…' : '+ Agregar imagen'}
      </button>
      {error && <div className="err">{error}</div>}
    </div>
  )
}
