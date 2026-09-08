/**
 * Copia de seguridad a archivo .json. Mientras no haya sincronización con la
 * nube (Etapa 2), esta es la forma de no perder los datos si se rompe el
 * celular o el navegador borra su almacenamiento.
 */

import type { Lote, Trabajo } from '../tipos'

interface ArchivoBackup {
  app: 'condor-bitacora'
  version: 1
  exportadoAt: string
  lotes: Lote[]
  trabajos: Trabajo[]
}

export function exportarJSON(lotes: Lote[], trabajos: Trabajo[]): void {
  const contenido: ArchivoBackup = {
    app: 'condor-bitacora',
    version: 1,
    exportadoAt: new Date().toISOString(),
    lotes,
    trabajos,
  }
  const blob = new Blob([JSON.stringify(contenido, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `condor-bitacora-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function importarJSON(file: File): Promise<{ lotes: Lote[]; trabajos: Trabajo[] }> {
  const texto = await file.text()
  const data = JSON.parse(texto) as Partial<ArchivoBackup>
  if (data.app !== 'condor-bitacora' || !Array.isArray(data.lotes) || !Array.isArray(data.trabajos)) {
    throw new Error('El archivo no parece una copia de la bitácora.')
  }
  return { lotes: data.lotes, trabajos: data.trabajos }
}
