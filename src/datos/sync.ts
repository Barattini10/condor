/**
 * Sincronización con Firestore (Etapa 2).
 *
 * Diseño: "last write wins" por registro, usando `updatedAt` (ya lo tenían
 * todos los registros desde la Etapa 1, pensado justo para esto). Cada
 * cambio local se sube a Firestore; cada cambio remoto se compara contra lo
 * que hay en IndexedDB y, si es más nuevo, se aplica local.
 *
 * Las imágenes NO se sincronizan por ahora (quedan solo en el dispositivo
 * donde se cargaron): son pesadas y superan fácil el límite de tamaño de un
 * documento de Firestore. Se sacan antes de subir un trabajo.
 */

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db as firestore } from '../lib/firebase'
import type { Lote, PuntoLatLng, Trabajo } from '../tipos'

const COL_LOTES = 'lotes'
const COL_TRABAJOS = 'trabajos'

/** Firestore no permite "listas dentro de listas", y `puntos` es una lista
 * de pares [lat, lng]. Viaja como lista de {lat, lng} y se arma de vuelta. */
interface LoteEnFirestore extends Omit<Lote, 'puntos'> {
  puntos: { lat: number; lng: number }[]
}

function aFirestore(l: Lote): LoteEnFirestore {
  return { ...l, puntos: l.puntos.map(([lat, lng]) => ({ lat, lng })) }
}

function deFirestore(l: LoteEnFirestore): Lote {
  const puntos: PuntoLatLng[] = l.puntos.map((p) => [p.lat, p.lng])
  return { ...l, puntos }
}

export async function subirLote(l: Lote): Promise<void> {
  await setDoc(doc(firestore, COL_LOTES, l.id), aFirestore(l))
}

export async function subirTrabajo(t: Trabajo): Promise<void> {
  // Las imágenes quedan afuera: ver comentario de arriba.
  const { imagenes: _imagenes, ...sinImagenes } = t
  await setDoc(doc(firestore, COL_TRABAJOS, t.id), sinImagenes)
}

/**
 * Escucha los cambios de Firestore en vivo. `onLote`/`onTrabajo` se llaman
 * por cada registro que cambió remotamente (alta, edición o borrado blando),
 * incluyendo los propios al confirmarse — quien llama decide si aplicarlo
 * comparando `updatedAt` contra lo que ya tiene.
 */
export function escucharCambios(
  onLote: (l: Lote) => void,
  onTrabajo: (t: Trabajo) => void,
): Unsubscribe {
  const offLotes = onSnapshot(collection(firestore, COL_LOTES), (snap) => {
    for (const cambio of snap.docChanges()) {
      if (cambio.type === 'removed') continue
      onLote(deFirestore(cambio.doc.data() as LoteEnFirestore))
    }
  })
  const offTrabajos = onSnapshot(collection(firestore, COL_TRABAJOS), (snap) => {
    for (const cambio of snap.docChanges()) {
      if (cambio.type === 'removed') continue
      // Los trabajos en Firestore no traen `imagenes` (ver subirTrabajo, es
      // un campo opcional). Quien llama decide qué hacer con las imágenes
      // que ya tenía guardadas localmente para ese trabajo al aplicar esto.
      onTrabajo(cambio.doc.data() as Trabajo)
    }
  })
  return () => {
    offLotes()
    offTrabajos()
  }
}
