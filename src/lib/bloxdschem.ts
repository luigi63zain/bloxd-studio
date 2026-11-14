/* Real bloxd.io .bloxdschem format (Avro-encoded, version 4 header, 32x32x32 run-length chunks).
   Based on the community converter by hansdiewurst. */
import { fixName, type SchemFile, type Voxels } from "./schem";

export const BLOCK_IDS: Record<string, number> = {
  "Air": 0, "Dirt": 2, "Grass Block": 4, "Sand": 5, "Maple Log": 9, "Maple Wood Planks": 15,
  "Stone": 28, "Messy Stone": 29, "Block of Coal": 46, "Block of Iron": 47, "Block of Gold": 48,
  "Block of Emerald": 50, "White Wool": 51, "Blue Wool": 62, "Red Wool": 65, "Black Wool": 66,
  "Glass": 106, "Bricks": 128, "Obsidian": 140, "Block of Diamond": 172,
};
const ID_NAMES: Record<number, string> = Object.fromEntries(Object.entries(BLOCK_IDS).map(([n, i]) => [i, n]));

class W {
  b: number[] = [];
  varint(v: number) { while (v >= 128) { this.b.push((v & 127) | 128); v = Math.floor(v / 128); } this.b.push(v); }
  long(n: number) { this.varint(n >= 0 ? n * 2 : -n * 2 - 1); }
  bytes(u: ArrayLike<number>) { this.long(u.length); for (let i = 0; i < u.length; i++) this.b.push(u[i] ?? 0); }
  str(s: string) { this.bytes(new TextEncoder().encode(s)); }
}
class R {
  i = 0;
  constructor(public b: Uint8Array) {}
  varint() { let v = 0, m = 1, byte: number; do { const next = this.b[this.i++]; if (next === undefined || m > 2 ** 49) throw new Error("Invalid schematic data"); byte = next; v += (byte & 127) * m; m *= 128; } while (byte & 128); return v; }
  long() { const v = this.varint(); return v % 2 ? -(v + 1) / 2 : v / 2; }
  bytes() { const n = this.long(); if (n < 0 || n > this.b.length - this.i) throw new Error("Invalid schematic length"); const s = this.b.subarray(this.i, this.i + n); this.i += n; return s; }
  str() { return new TextDecoder().decode(this.bytes()); }
}

const C = 32;

export function encodeBloxdschem(name: string, vox: Voxels, size: [number, number, number]): Uint8Array {
  const [sx, sy, sz] = size;
  const cx = Math.ceil(sx / C), cy = Math.ceil(sy / C), cz = Math.ceil(sz / C);
  const w = new W();
  w.b.push(4, 0, 0, 0);
  w.str(name || "schematic");
  w.long(0); w.long(0); w.long(0);
  w.long(sx); w.long(sy); w.long(sz);
  w.long(cx * cy * cz);
  for (let X = 0; X < cx; X++) for (let Y = 0; Y < cy; Y++) for (let Z = 0; Z < cz; Z++) {
    w.long(X); w.long(Y); w.long(Z);
    const rle = new W();
    let cur = -1, amt = 0;
    for (let x = 0; x < C; x++) for (let y = 0; y < C; y++) for (let z = 0; z < C; z++) {
      const b = vox[`${X * C + x},${Y * C + y},${Z * C + z}`];
      const id = b ? BLOCK_IDS[fixName(b)] ?? (BLOCK_IDS["Stone"] ?? 28) : 0;
      if (id === cur) amt++;
      else { if (amt) { rle.varint(amt); rle.varint(cur); } cur = id; amt = 1; }
    }
    rle.varint(amt); rle.varint(cur);
    w.bytes(rle.b);
  }
  w.long(0); /* end of chunks array */
  w.long(0); /* blockdatas: empty */
  w.long(0); w.long(0); w.long(0); /* globalX/Y/Z */
  w.long(0); /* worldcode: null */
  w.b.push(0); /* flag: false */
  return new Uint8Array(w.b);
}

export function decodeBloxdschem(buf: Uint8Array): { name: string; vox: Voxels; size: [number, number, number] } {
  if (buf.length < 8 || buf[0] !== 4 || buf[1] !== 0 || buf[2] !== 0 || buf[3] !== 0) throw new Error("Unsupported schematic version");
  const r = new R(buf);
  r.i = 4;
  const name = r.str();
  const ox = r.long(), oy = r.long(), oz = r.long();
  const size: [number, number, number] = [r.long(), r.long(), r.long()];
  if (size.some(v => v < 1 || v > 128)) throw new Error("Schematic dimensions must be 1–128 blocks");
  const vox: Voxels = {};
  let chunks = 0;
  for (let n = r.long(); n !== 0; n = r.long()) {
    if (n < 0) { n = -n; r.long(); }
    if (chunks + n > 64) throw new Error("Schematic has too many chunks");
    chunks += n;
    for (let k = 0; k < Math.abs(n); k++) {
      const X = r.long(), Y = r.long(), Z = r.long();
      if ([X,Y,Z].some(v => v < 0 || v > 3)) throw new Error("Invalid chunk coordinates");
      const data = new R(r.bytes());
      let idx = 0;
      while (data.i < data.b.length) {
        const amt = data.varint(), id = data.varint();
        if (amt < 1 || idx + amt > 32768) throw new Error("Invalid schematic run");
        if (id !== 0) {
          for (let j = 0; j < amt; j++) {
            const p = idx + j, x = Math.floor(p / 1024), y = Math.floor(p / 32) % 32, z = p % 32;
            vox[`${X * C + x - ox},${Y * C + y - oy},${Z * C + z - oz}`] = ID_NAMES[id] ?? "Stone";
          }
        }
        idx += amt;
      }
    }
  }
  return { name, vox, size };
}

export function downloadBloxdschem(name: string, vox: Voxels, size: [number, number, number]) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([encodeBloxdschem(name, vox, size) as BlobPart], { type: "application/octet-stream" }));
  a.download = `${name || "schematic"}.bloxdschem`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* Reads either a real bloxd.io file or an older BloxdStudio JSON file. */
export async function readSchemFile(f: File): Promise<{ name: string; vox: Voxels }> {
  const buf = new Uint8Array(await f.arrayBuffer());
  if (buf[0] === 0x7b) {
    const p = JSON.parse(new TextDecoder().decode(buf)) as SchemFile;
    if (p.format !== "bloxdschem") throw new Error("bad");
    const v: Voxels = {};
    if (!Array.isArray(p.blocks) || p.blocks.length > 15000) throw new Error("Invalid schematic blocks");
    for (const [x, y, z, b] of p.blocks) v[`${x},${y},${z}`] = fixName(b);
    return { name: p.name, vox: v };
  }
  const d = decodeBloxdschem(buf);
  return { name: d.name, vox: d.vox };
}
