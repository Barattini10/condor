/**
 * Genera los íconos PNG de la PWA (placeholder). Correr con:  node scripts/gen-icons.mjs
 * Fondo verde Cóndor con un círculo crema centrado. Reemplazar por el logo real
 * cuando esté.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(DIR, { recursive: true })

const FONDO = [0x17, 0x1c, 0x14] // --tierra
const VERDE = [0x40, 0x67, 0x3b] // --verde
const CREMA = [0xf2, 0xf0, 0xe8] // --crema

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'latin1')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function png(size, { maskable }) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  const cx = size / 2
  const cy = size / 2
  const rCirculo = size * (maskable ? 0.3 : 0.34)
  const rAnillo = size * 0.42

  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filtro de la fila
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      let col
      if (d < rCirculo) col = CREMA
      else if (d < rAnillo && !maskable) col = VERDE
      else col = maskable ? VERDE : FONDO
      raw[p++] = col[0]
      raw[p++] = col[1]
      raw[p++] = col[2]
      raw[p++] = 255
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const salidas = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['icon-512-maskable.png', 512, { maskable: true }],
]
for (const [nombre, size, opts] of salidas) {
  writeFileSync(join(DIR, nombre), png(size, opts))
  console.log('escrito', nombre)
}
