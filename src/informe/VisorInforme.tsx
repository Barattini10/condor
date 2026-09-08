/** Pantalla completa que muestra el informe en un iframe, con descarga. */

import type { Informe } from './armarInforme'

export function VisorInforme({
  informe,
  onCerrar,
}: {
  informe: Informe
  onCerrar: () => void
}) {
  function descargar() {
    const blob = new Blob([informe.html], { type: 'text/html;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = informe.nombre
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div id="visor" className="on">
      <div className="v-barra">
        <b>Informe de aplicación</b>
        <button className="mini" onClick={descargar}>
          Descargar
        </button>
        <button className="mini" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
      <iframe id="v-frame" title="Informe" srcDoc={informe.html} />
    </div>
  )
}
