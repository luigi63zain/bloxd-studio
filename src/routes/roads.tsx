import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { ShareButton } from "@/components/ShareDialog";
import { COLOR, PALETTE, schemCode, toFile, type Voxels } from "@/lib/schem";

export const Route = createFileRoute("/roads")({
  head: () => ({
    meta: [
      { title: "Road Generator — BloxdStudio" },
      { name: "description", content: "Draw a path and generate a bloxd.io road schematic that follows it." },
      { property: "og:title", content: "Road Generator — BloxdStudio" },
      { property: "og:description", content: "Draw lines, pick materials, and export a road as a .bloxdschem file." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Roads,
});

const G = 48;
const CELL = 12;
type P = [number, number];

function buildRoad(pts: P[], width: number, road: string, edge: string, line: string, lines: boolean): Voxels {
  const v: Voxels = {};
  const r = width / 2;
  const edgeR = r + 1;
  // distance from every cell to path
  for (let x = 0; x < G; x++) for (let z = 0; z < G; z++) {
    let best = Infinity, center = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i]!, [bx, bz] = pts[i + 1]!;
      const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L));
      const d = Math.hypot(x - (ax + t * dx), z - (az + t * dz));
      if (d < best) { best = d; center = d; }
    }
    if (pts.length === 1) best = center = Math.hypot(x - pts[0]![0], z - pts[0]![1]);
    if (best <= r) v[`${x},0,${z}`] = lines && center < 0.5 && (x + z) % 4 < 2 ? line : road;
    else if (best <= edgeR && edge !== "None") v[`${x},0,${z}`] = edge;
  }
  return v;
}

function Pick({ label, value, onChange, none }: { label: string; value: string; onChange: (s: string) => void; none?: boolean }) {
  return (
    <label className="block text-xs">
      <span className="text-[10px] uppercase tracking-[0.18em] text-steel">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg bg-card px-2 py-1.5 ring-1 ring-border">
        {none && <option>None</option>}
        {PALETTE.map((p) => <option key={p.name}>{p.name}</option>)}
      </select>
    </label>
  );
}

function Roads() {
  const [name, setName] = useState("my_road");
  const [pts, setPts] = useState<P[]>([]);
  const [width, setWidth] = useState(3);
  const [road, setRoad] = useState("Cobblestone");
  const [edge, setEdge] = useState("Stone");
  const [line, setLine] = useState("White Wool");
  const [lines, setLines] = useState(true);

  const vox = useMemo(() => (pts.length ? buildRoad(pts, width, road, edge, line, lines) : {}), [pts, width, road, edge, line, lines]);
  const code = useMemo(() => schemCode(vox), [vox]);
  const file = useMemo(() => toFile(name, vox, [G, 1, G]), [name, vox]);

  const exportFile = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
    a.download = `${name || "road"}.bloxdschem`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <section className="glass mt-6 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Road name" className="bg-transparent font-display text-sm font-bold outline-none" />
              <div className="text-[11px] text-steel">{pts.length} points · {Object.keys(vox).length} blocks · {G}×{G}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setPts((p) => p.slice(0, -1))} className="btn-ghost rounded-lg px-3 py-2 text-xs">Undo point</button>
              <button onClick={() => setPts([])} className="btn-ghost rounded-lg px-3 py-2 text-xs text-coral">Clear</button>
              <button onClick={exportFile} disabled={!pts.length} className="btn-ghost rounded-lg px-3 py-2 text-xs">Export .bloxdschem</button>
              <ShareButton kind="schematic" defaultTitle={name} data={file} code={code} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[220px_auto_1fr]">
            <div className="space-y-3 rounded-xl bg-ink/60 p-3 ring-1 ring-inset ring-border">
              <label className="block text-xs">
                <span className="text-[10px] uppercase tracking-[0.18em] text-steel">Width: {width}</span>
                <input type="range" min={1} max={9} value={width} onChange={(e) => setWidth(+e.target.value)} className="mt-1 w-full" />
              </label>
              <Pick label="Road" value={road} onChange={setRoad} />
              <Pick label="Edges" value={edge} onChange={setEdge} none />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={lines} onChange={(e) => setLines(e.target.checked)} /> Center lines</label>
              {lines && <Pick label="Line" value={line} onChange={setLine} />}
            </div>

            <div className="rounded-xl bg-ink/80 p-3 ring-1 ring-inset ring-border">
              <svg width={G * CELL} height={G * CELL} className="cursor-crosshair rounded bg-card"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setPts((p) => [...p, [Math.floor((e.clientX - r.left) / CELL), Math.floor((e.clientY - r.top) / CELL)]]);
                }}>
                {Object.entries(vox).map(([k, b]) => {
                  const [x, , z] = k.split(",").map(Number) as [number, number, number];
                  return <rect key={k} x={x * CELL} y={z * CELL} width={CELL - 1} height={CELL - 1} rx={2} fill={COLOR[b]} />;
                })}
                <polyline points={pts.map(([x, z]) => `${x * CELL + CELL / 2},${z * CELL + CELL / 2}`).join(" ")}
                  fill="none" stroke="var(--bright)" strokeWidth={2} strokeDasharray="4 3" />
                {pts.map(([x, z], i) => <circle key={i} cx={x * CELL + CELL / 2} cy={z * CELL + CELL / 2} r={4} fill="var(--bright)" />)}
              </svg>
              <p className="mt-2 text-[10px] text-steel">Click to add points — the road follows the line between them</p>
            </div>

            <div className="flex flex-col rounded-xl bg-ink/90 p-3 ring-1 ring-inset ring-border">
              <span className="text-[10px] uppercase tracking-[0.18em] text-steel">build code</span>
              <pre className="mt-2 max-h-[480px] flex-1 overflow-auto text-[11px] text-foreground/85"><code>{code}</code></pre>
              <button onClick={async () => { await navigator.clipboard.writeText(code); toast.success("Road code copied"); }} className="btn-voxel mt-3 rounded-lg px-3 py-2.5 text-sm">⧉ Copy code</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
