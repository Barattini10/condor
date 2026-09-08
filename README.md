# Cóndor Agro — Bitácora de lotes

App para registrar los trabajos con drones agrícolas: un mapa donde se dibujan o
importan los lotes, y al tocar un lote se ven todos los trabajos hechos ahí
(producto, dosis, caudal, registro de vuelos batería por batería, gastos), con un
informe en PDF para el cliente.

**Funciona sin señal**: una vez abierta con conexión, la app queda instalada y
disponible offline. Los datos se guardan en el celular (IndexedDB).

Stack: React + TypeScript + Vite. Mapa con Leaflet. PWA con `vite-plugin-pwa`.

## Correr en desarrollo

```
npm install
npm run dev
```

Abre en `http://localhost:5173`.

## Ver la versión offline de verdad (service worker)

El service worker solo se activa en el build de producción:

```
npm run build
npm run preview
```

## Instalar en el iPhone

Abrir la URL publicada en Safari → Compartir → **Añadir a pantalla de inicio**.
A partir de ahí abre como una app y funciona sin señal.

## Crear lotes

- **+ Lote**: dibujar las esquinas a mano sobre el mapa.
- **Ir a ubicación**: pegar coordenadas (decimales `-33.8, -59.5` o grados
  `33°53'09.6"S 59°30'49.0"W`) o un link de Google Maps / WhatsApp; el mapa se
  centra ahí con una chincheta para dibujar al lado. Los links acortados
  (`maps.app.goo.gl`) se intentan resolver solo si hay señal.
- **⬆ Importar**: archivo KML, KMZ, GeoJSON, o `.zip` con el shapefile
  (`.shp/.shx/.dbf`). Toma la geometría real (contornos de Pix4Dfields, por
  ejemplo), lista los polígonos encontrados y deja elegir cuáles importar,
  ponerles nombre y un establecimiento común. Los shapefile se reproyectan a
  WGS84 con la info del `.prj`; si vienen en coordenadas proyectadas sin `.prj`,
  hay que exportarlos en EPSG:4326.

## Guardar la imagen satelital de una zona

Con señal, en el mapa: botón **⬇ Guardar mapa**. Descarga los tiles del recuadro
visible (zoom actual ±2) para poder verlos después sin conexión. Es una versión
básica; administrar el espacio y elegir zonas por establecimiento llega más
adelante.

## Copia de seguridad

Pantalla **Números** → **Exportar copia (.json)** / **Importar copia**. Mientras
no haya sincronización con la nube, esta es la forma de no perder datos si se
rompe el celular. La sincronización celular ↔ oficina (con Firestore) es la
Etapa 2.

## Estructura

```
src/
  tipos.ts                 Lote, Trabajo, Vuelo, Gastos
  datos/
    db.ts                  IndexedDB (idb)
    store.tsx              <BitacoraProvider>: estado + autoguardado
    bitacora-context.ts    hook useBitacora() y tipos del contexto
    backup.ts              exportar / importar .json
  lib/
    formato.ts             plata, fechas, números
    geo.ts                 área en hectáreas, centroide, índices de tile
    calculos.ts            ha/min/litros/caudal/margen de un trabajo
  mapa/
    Mapa.tsx               Leaflet (imperativo) + modo dibujo
    config.ts              proveedor de tiles y encuadre inicial
    tilesOffline.ts        descarga de tiles de la zona visible
  lotes/                   ListaLotes, DetalleLote, FormNuevoLote
  trabajos/                FormTrabajo, RegistroVuelos
  resumen/Resumen.tsx      vista "Números" + CSV + backup
  informe/
    armarInforme.ts        HTML del informe para el cliente
    VisorInforme.tsx       visor en iframe + descarga
scripts/gen-icons.mjs      genera los íconos PNG de la PWA (placeholder)
```

El prototipo original quedó en `condor-bitacora.html` como referencia.

## Ideas futuras

- **Sincronización celular ↔ oficina** (Etapa 2): cuenta compartida + Firestore,
  última escritura gana por registro.
- **Ortomosaico propio como capa de fondo**: en vez del satelital, mostrar el
  ortomosaico del Mavic 3M. Los GeoTIFF pesan cientos de MB, así que no se pueden
  cargar en el celular directo — habría que procesarlos antes a tiles (en la
  compu o un servicio) y que la app consuma esos tiles, con descarga por zona
  como la del satelital.

