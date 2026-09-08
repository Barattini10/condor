/**
 * Convierte GeoJSON (directo, o el que devuelve shpjs para shapefiles) en
 * lotes listos para importar. Toma solo el anillo exterior de cada polígono.
 */

import type {
  Feature,
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
} from 'geojson'
import type { PuntoLatLng } from '../tipos'
import { hectareas } from '../lib/geo'

export interface LoteImportado {
  nombre: string
  puntos: PuntoLatLng[]
  ha: number
}

const CLAVES_NOMBRE = [
  'name', 'nombre', 'lote', 'label', 'title', 'titulo',
  'id', 'layer', 'zona', 'zone', 'field', 'campo', 'plot',
]

function nombreDe(props: GeoJsonProperties, indice: number): string {
  if (props) {
    for (const clave of Object.keys(props)) {
      if (CLAVES_NOMBRE.includes(clave.toLowerCase())) {
        const v = props[clave]
        if (v != null && String(v).trim()) return String(v).trim()
      }
    }
  }
  return `Lote ${indice + 1}`
}

/** [lng,lat][] (GeoJSON) -> [lat,lng][], sin el punto de cierre repetido. */
function anilloAPuntos(anillo: number[][]): PuntoLatLng[] {
  const pts: PuntoLatLng[] = anillo
    .filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map((c) => [c[1], c[0]] as PuntoLatLng)
  if (pts.length > 1) {
    const a = pts[0]
    const b = pts[pts.length - 1]
    if (a[0] === b[0] && a[1] === b[1]) pts.pop()
  }
  return pts
}

/** Anillos exteriores de todos los polígonos de una geometría. */
function* anillosExteriores(geom: Geometry | null): Generator<number[][]> {
  if (!geom) return
  if (geom.type === 'Polygon') {
    if (geom.coordinates[0]) yield geom.coordinates[0]
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) if (poly[0]) yield poly[0]
  } else if (geom.type === 'GeometryCollection') {
    for (const g of geom.geometries) yield* anillosExteriores(g)
  }
}

export function desdeGeoJSON(gj: unknown): LoteImportado[] {
  const obj = gj as FeatureCollection | Feature | Geometry
  let features: Feature[]
  if (obj && obj.type === 'FeatureCollection') {
    features = obj.features
  } else if (obj && obj.type === 'Feature') {
    features = [obj]
  } else {
    features = [
      { type: 'Feature', geometry: obj as Geometry, properties: {} },
    ]
  }

  const out: LoteImportado[] = []
  let i = 0
  for (const f of features) {
    for (const anillo of anillosExteriores(f.geometry)) {
      const puntos = anilloAPuntos(anillo)
      if (puntos.length >= 3) {
        out.push({ nombre: nombreDe(f.properties, i), puntos, ha: hectareas(puntos) })
        i++
      }
    }
  }
  return out
}
