import { deflateSync } from "node:zlib";

// Genera un PNG real (RGB, sin filtro) con datos de píxel pseudoaleatorios.
// El contenido aleatorio apenas comprime, de modo que el tamaño del buffer es
// representativo de una foto de teléfono real (varios MB).

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** PNG RGB válido de `width`×`height` con píxeles aleatorios. */
export function fotoPngBytes(width = 1600, height = 1200): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB

  const stride = width * 3 + 1; // 1 byte de filtro por fila
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const off = y * stride;
    raw[off] = 0; // filtro: none
    for (let x = 0; x < width * 3; x++) raw[off + 1 + x] = (Math.random() * 256) | 0;
  }

  const idat = deflateSync(raw, { level: 6 });
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
