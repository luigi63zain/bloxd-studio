export const SIZE = 16;
export const HEIGHT = 16;

export const PALETTE: { name: string; color: string }[] = [
  { name: "Grass Block", color: "oklch(0.68 0.16 140)" },
  { name: "Dirt", color: "oklch(0.5 0.08 60)" },
  { name: "Stone", color: "oklch(0.62 0.01 250)" },
  { name: "Cobblestone", color: "oklch(0.52 0.01 250)" },
  { name: "Maple Planks", color: "oklch(0.7 0.1 70)" },
  { name: "Maple Log", color: "oklch(0.45 0.07 55)" },
  { name: "Sand", color: "oklch(0.88 0.08 90)" },
  { name: "Glass", color: "oklch(0.9 0.05 210 / 60%)" },
  { name: "Brick", color: "oklch(0.55 0.14 30)" },
  { name: "Gold Block", color: "oklch(0.85 0.16 90)" },
  { name: "Diamond Block", color: "oklch(0.85 0.1 195)" },
  { name: "Obsidian", color: "oklch(0.25 0.05 300)" },
  { name: "Red Wool", color: "oklch(0.6 0.2 25)" },
  { name: "Blue Wool", color: "oklch(0.55 0.17 260)" },
  { name: "White Wool", color: "oklch(0.95 0 0)" },
  { name: "Black Wool", color: "oklch(0.22 0 0)" },
];
export const COLOR = Object.fromEntries(PALETTE.map((p) => [p.name, p.color]));

/** key "x,y,z" -> block name */
export type Voxels = Record<string, string>;

export type SchemFile = { format: "bloxdschem"; version: 1; name: string; size: [number, number, number]; blocks: [number, number, number, string][] };

export function toFile(name: string, v: Voxels, size: [number, number, number] = [SIZE, HEIGHT, SIZE]): SchemFile {
  return {
    format: "bloxdschem", version: 1, name, size,
    blocks: Object.entries(v).map(([k, b]) => { const [x, y, z] = k.split(",").map(Number); return [x!, y!, z!, b]; }),
  };
}
export function fromFile(f: SchemFile): Voxels {
  const v: Voxels = {};
  for (const [x, y, z, b] of f.blocks) v[`${x},${y},${z}`] = b;
  return v;
}

export function schemCode(v: Voxels): string {
  const entries = Object.entries(v);
  if (!entries.length) return "// place some blocks first\n";
  const list = entries.map(([k, b]) => `  [${k}, ${JSON.stringify(b)}],`).join("\n");
  return `// Builds the schematic in front of the player who runs it
const [px, py, pz] = api.getPosition(myId);
const blocks = [
${list}
];
for (const [x, y, z, name] of blocks) {
  api.setBlock(Math.floor(px) + x, Math.floor(py) + y, Math.floor(pz) + z, name);
}
`;
}
