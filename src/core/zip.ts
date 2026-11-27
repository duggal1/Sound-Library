export interface ZipEntry {
  readonly name: string;
  readonly data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/** Store-only (method 0) ZIP. WAV barely compresses, and this needs zero dependencies. */
export function createZip(entries: readonly ZipEntry[], modified: Date = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(modified);
  const files = entries.map((entry) => ({
    name: encoder.encode(entry.name),
    data: entry.data,
    crc: crc32(entry.data),
  }));

  let localSize = 0;
  let centralSize = 0;
  for (const f of files) {
    localSize += 30 + f.name.length + f.data.length;
    centralSize += 46 + f.name.length;
  }

  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  const offsets: number[] = [];
  let o = 0;

  for (const f of files) {
    offsets.push(o);
    view.setUint32(o, 0x04034b50, true); // local file header
    view.setUint16(o + 4, 20, true); // version needed
    view.setUint16(o + 6, 0x0800, true); // UTF-8 names
    view.setUint16(o + 8, 0, true); // stored
    view.setUint16(o + 10, time, true);
    view.setUint16(o + 12, date, true);
    view.setUint32(o + 14, f.crc, true);
    view.setUint32(o + 18, f.data.length, true);
    view.setUint32(o + 22, f.data.length, true);
    view.setUint16(o + 26, f.name.length, true);
    view.setUint16(o + 28, 0, true);
    out.set(f.name, o + 30);
    out.set(f.data, o + 30 + f.name.length);
    o += 30 + f.name.length + f.data.length;
  }

  const centralStart = o;
  files.forEach((f, i) => {
    view.setUint32(o, 0x02014b50, true); // central directory header
    view.setUint16(o + 4, 20, true); // version made by
    view.setUint16(o + 6, 20, true); // version needed
    view.setUint16(o + 8, 0x0800, true);
    view.setUint16(o + 10, 0, true);
    view.setUint16(o + 12, time, true);
    view.setUint16(o + 14, date, true);
    view.setUint32(o + 16, f.crc, true);
    view.setUint32(o + 20, f.data.length, true);
    view.setUint32(o + 24, f.data.length, true);
    view.setUint16(o + 28, f.name.length, true);
    view.setUint16(o + 30, 0, true); // extra
    view.setUint16(o + 32, 0, true); // comment
    view.setUint16(o + 34, 0, true); // disk start
    view.setUint16(o + 36, 0, true); // internal attrs
    view.setUint32(o + 38, 0, true); // external attrs
    view.setUint32(o + 42, offsets[i], true);
    out.set(f.name, o + 46);
    o += 46 + f.name.length;
  });

  view.setUint32(o, 0x06054b50, true); // end of central directory
  view.setUint16(o + 4, 0, true);
  view.setUint16(o + 6, 0, true);
  view.setUint16(o + 8, files.length, true);
  view.setUint16(o + 10, files.length, true);
  view.setUint32(o + 12, o - centralStart, true);
  view.setUint32(o + 16, centralStart, true);
  view.setUint16(o + 20, 0, true);
  return out;
}
