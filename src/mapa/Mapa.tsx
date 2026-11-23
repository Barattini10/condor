/**
 * Mapa con Leaflet, manejado de forma imperativa dentro de este componente.
 * Hacia afuera expone unos pocos métodos (empezar a dibujar, deshacer, etc.)
 * mediante `ref`; App le pasa los lotes y escucha los eventos.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Lote, PuntoLatLng } from '../tipos'
import { centro, hectareas } from '../lib/geo'
import { esc } from '../lib/formato'
import type { Coord } from '../lib/ubicacion'
import {
  CENTRO_INICIAL,
  TILE_ATTR,
  TILE_MAX_ZOOM,
  TILE_URL,
  ZOOM_INICIAL,
} from './config'
import {
  descargarZona as descargarTiles,
  type ProgresoDescarga,
} from './tilesOffline'

export interface MapaHandle {
  empezarDibujo: () => void
  deshacerPunto: () => void
  cerrarLote: () => void
  cancelarDibujo: () => void
  empezarEdicionForma: (puntos: PuntoLatLng[]) => void
  guardarEdicionForma: () => { puntos: PuntoLatLng[]; ha: number } | null
  cancelarEdicionForma: () => void
  descargarZona: (
    onProgreso?: (p: ProgresoDescarga) => void,
  ) => Promise<ProgresoDescarga>
  irAUbicacion: (c: Coord) => void
  limpiarUbicacion: () => void
  encuadrarPuntos: (pts: PuntoLatLng[]) => void
}

/** Chincheta para el punto de "Ir a ubicación". */
const PIN_SVG =
  '<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M12 2c-3.9 0-7 3-7 6.9 0 4.9 7 12.6 7 12.6s7-7.7 7-12.6C19 5 15.9 2 12 2z" ' +
  'fill="#e0705e" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>' +
  '<circle cx="12" cy="9" r="2.6" fill="#fff"/></svg>'

interface MapaProps {
  lotes: Lote[]
  lotesConTrabajos: Set<string>
  loteSeleccionadoId: string | null
  loteEditandoId: string | null
  onSeleccionarLote: (id: string) => void
  onDibujoProgreso: (info: { puntos: number; ha: number }) => void
  onLoteDibujado: (puntos: PuntoLatLng[], ha: number) => void
}

export const Mapa = forwardRef<MapaHandle, MapaProps>(function Mapa(props, ref) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const capaLotesRef = useRef<L.LayerGroup | null>(null)
  const capaDibujoRef = useRef<L.LayerGroup | null>(null)
  const capaMarcadorRef = useRef<L.LayerGroup | null>(null)
  const capasPorLoteRef = useRef<Record<string, L.Polygon>>({})
  const encuadreInicialRef = useRef(false)

  // Estado del dibujo/edición en curso (fuera de React: no necesita re-render).
  // 'dibujo': armando un lote nuevo punto a punto. 'edicion': ajustando la
  // forma de un lote ya guardado (los puntos vienen todos puestos).
  const modoRef = useRef<'dibujo' | 'edicion' | null>(null)
  const puntosRef = useRef<PuntoLatLng[]>([])
  const marcasRef = useRef<L.Marker[]>([])
  const lineaRef = useRef<L.Polygon | null>(null)

  // Callbacks siempre frescos, para no quedar con versiones viejas dentro
  // de los listeners de Leaflet.
  const cbRef = useRef(props)
  cbRef.current = props

  function avisarProgreso() {
    const pts = puntosRef.current
    cbRef.current.onDibujoProgreso({ puntos: pts.length, ha: hectareas(pts) })
  }

  function redibujarLinea() {
    const capa = capaDibujoRef.current
    if (!capa) return
    if (lineaRef.current) {
      capa.removeLayer(lineaRef.current)
      lineaRef.current = null
    }
    if (puntosRef.current.length >= 2) {
      lineaRef.current = L.polygon(puntosRef.current, {
        color: '#d7e5d0',
        weight: 2,
        dashArray: '5,4',
        fillColor: '#40673b',
        fillOpacity: 0.3,
      }).addTo(capa)
    }
  }

  /** Punto arrastrable: tomarlo y moverlo corrige el vértice; doble click lo
   * borra (dejando al menos 3, lo mínimo para cerrar un lote). */
  function crearMarcaPunto(ll: L.LatLngExpression): L.Marker {
    const marca = L.marker(ll, {
      draggable: true,
      icon: L.divIcon({
        className: 'punto-vertice',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    })
    marca.on('drag', () => {
      const i = marcasRef.current.indexOf(marca)
      if (i === -1) return
      const p = marca.getLatLng()
      puntosRef.current[i] = [p.lat, p.lng]
      redibujarLinea()
      avisarProgreso()
    })
    marca.on('dblclick', (e) => {
      L.DomEvent.stopPropagation(e)
      const i = marcasRef.current.indexOf(marca)
      if (i === -1 || puntosRef.current.length <= 3) return
      puntosRef.current.splice(i, 1)
      marcasRef.current.splice(i, 1)
      capaDibujoRef.current?.removeLayer(marca)
      redibujarLinea()
      avisarProgreso()
    })
    return marca
  }

  function agregarPunto(ll: L.LatLng) {
    const capa = capaDibujoRef.current
    if (!capa) return
    puntosRef.current.push([ll.lat, ll.lng])
    const marca = crearMarcaPunto(ll)
    marca.addTo(capa)
    marcasRef.current.push(marca)
    redibujarLinea()
    avisarProgreso()
  }

  function limpiarDibujo() {
    modoRef.current = null
    puntosRef.current = []
    marcasRef.current = []
    lineaRef.current = null
    capaDibujoRef.current?.clearLayers()
  }

  useImperativeHandle(
    ref,
    () => ({
      empezarDibujo() {
        limpiarDibujo()
        modoRef.current = 'dibujo'
        avisarProgreso()
      },
      deshacerPunto() {
        if (!puntosRef.current.length) return
        puntosRef.current.pop()
        const marca = marcasRef.current.pop()
        if (marca) capaDibujoRef.current?.removeLayer(marca)
        redibujarLinea()
        avisarProgreso()
      },
      cerrarLote() {
        const pts = puntosRef.current.slice()
        if (pts.length < 3) return
        const ha = hectareas(pts)
        limpiarDibujo()
        capaMarcadorRef.current?.clearLayers()
        cbRef.current.onLoteDibujado(pts, ha)
      },
      cancelarDibujo() {
        limpiarDibujo()
      },
      empezarEdicionForma(puntos) {
        limpiarDibujo()
        const capa = capaDibujoRef.current
        if (!capa) return
        modoRef.current = 'edicion'
        puntosRef.current = puntos.map((p): PuntoLatLng => [p[0], p[1]])
        puntosRef.current.forEach((p) => {
          const marca = crearMarcaPunto(p)
          marca.addTo(capa)
          marcasRef.current.push(marca)
        })
        redibujarLinea()
        avisarProgreso()
      },
      guardarEdicionForma() {
        const pts = puntosRef.current.slice()
        if (pts.length < 3) return null
        const ha = hectareas(pts)
        limpiarDibujo()
        return { puntos: pts, ha }
      },
      cancelarEdicionForma() {
        limpiarDibujo()
      },
      async descargarZona(onProgreso) {
        if (!mapRef.current) return { hechos: 0, total: 0 }
        return descargarTiles(mapRef.current, onProgreso)
      },
      irAUbicacion(c) {
        const map = mapRef.current
        const capa = capaMarcadorRef.current
        if (!map || !capa) return
        capa.clearLayers()
        L.marker([c.lat, c.lng], {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: '',
            html: PIN_SVG,
            iconSize: [30, 30],
            iconAnchor: [15, 29],
          }),
        }).addTo(capa)
        map.setView([c.lat, c.lng], Math.max(map.getZoom(), 16))
      },
      limpiarUbicacion() {
        capaMarcadorRef.current?.clearLayers()
      },
      encuadrarPuntos(pts) {
        const map = mapRef.current
        if (!map || !pts.length) return
        try {
          map.fitBounds(L.latLngBounds(pts).pad(0.25))
        } catch {
          /* sin puntos válidos */
        }
      },
    }),
    [],
  )

  // Crear el mapa una sola vez.
  useEffect(() => {
    const div = divRef.current
    if (!div) return

    const map = L.map(div, { zoomControl: false }).setView(
      CENTRO_INICIAL,
      ZOOM_INICIAL,
    )
    L.tileLayer(TILE_URL, {
      maxZoom: TILE_MAX_ZOOM,
      attribution: TILE_ATTR,
    }).addTo(map)
    L.control.zoom({ position: 'topleft' }).addTo(map)

    capaLotesRef.current = L.layerGroup().addTo(map)
    capaMarcadorRef.current = L.layerGroup().addTo(map)
    capaDibujoRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (modoRef.current === 'dibujo') agregarPunto(e.latlng)
    })

    const t = window.setTimeout(() => map.invalidateSize(), 200)
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(div)

    return () => {
      window.clearTimeout(t)
      ro.disconnect()
      map.remove()
      mapRef.current = null
      capaLotesRef.current = null
      capaDibujoRef.current = null
      capaMarcadorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { lotes, lotesConTrabajos, loteSeleccionadoId, loteEditandoId } = props

  // Redibujar los lotes cuando cambian.
  useEffect(() => {
    const map = mapRef.current
    const capa = capaLotesRef.current
    if (!map || !capa) return

    capa.clearLayers()
    capasPorLoteRef.current = {}

    lotes.forEach((l) => {
      // El que se está editando se muestra con los puntos arrastrables
      // (capaDibujoRef), no con su polígono fijo de siempre.
      if (l.id === loteEditandoId) return
      const trabajado = lotesConTrabajos.has(l.id)
      const poly = L.polygon(l.puntos, {
        color: trabajado ? '#8fc07a' : '#d7e5d0',
        weight: 2,
        opacity: trabajado ? 1 : 0.75,
        fillColor: trabajado ? '#40673b' : '#d7e5d0',
        fillOpacity: trabajado ? 0.45 : 0.1,
      })
      poly.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        cbRef.current.onSeleccionarLote(l.id)
      })
      poly.addTo(capa)
      capasPorLoteRef.current[l.id] = poly

      L.marker(centro(l.puntos), {
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: `<div class="lote-tag${trabajado ? '' : ' virgen'}">${esc(l.nombre)}</div>`,
          iconSize: [0, 0],
        }),
      }).addTo(capa)
    })

    const seleccionada =
      loteSeleccionadoId && loteSeleccionadoId !== loteEditandoId
        ? capasPorLoteRef.current[loteSeleccionadoId]
        : null
    if (seleccionada) {
      try {
        map.fitBounds(seleccionada.getBounds().pad(0.4))
      } catch {
        /* bounds inválidos */
      }
    } else if (!loteEditandoId && lotes.length && !encuadreInicialRef.current) {
      encuadreInicialRef.current = true
      const todos: PuntoLatLng[] = []
      lotes.forEach((l) => l.puntos.forEach((p) => todos.push(p)))
      try {
        map.fitBounds(L.latLngBounds(todos).pad(0.25))
      } catch {
        /* sin puntos */
      }
    }
  }, [lotes, lotesConTrabajos, loteSeleccionadoId, loteEditandoId])

  return <div id="mapa" ref={divRef} />
})
