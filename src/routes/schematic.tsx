import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { ShareButton } from "@/components/ShareDialog";
import { COLOR, HEIGHT, PALETTE, SIZE, fromFile, schemCode, toFile, type SchemFile, type Voxels } from "@/lib/schem";

export const Route = createFileRoute("/schematic")({
  head: () => ({
    meta: [
      { title: "Schematic Builder — BloxdStudio" },
      { name: "description", content: "Build bloxd.io structures layer by layer and export them as .bloxdschem files." },
      { property: "og:title", content: "Schematic Builder — BloxdStudio" },
      { property: "og:description", content: "Paint voxel builds layer by layer, export .bloxdschem files and share them." },
    ],
  }),
  component: Schematic,
});

const STORAGE = "bloxdstudio-schem";

function Schematic() {
  const [name, setName] = useState("my_schematic");
  const [vox, setVox] = useState<Voxels>({});
  const [layer, setLayer] = useState(0);
  const [block, setBlock] = useState(PALETTE[0]!.name);
  const [erase, setErase] = useState(false);
  const painting = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { const r = localStorage.getItem(STORAGE); if (r) { const p = JSON.parse(r); setName(p.name); setVox(p.vox); } } catch {}
    const up = () => (painting.current = false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE, JSON.stringify({ name, vox })); }, [name, vox]);

  const paint = (x: number, z: number) => {
    const k = `${x},${layer},${z}`;
    setVox((v) => {
      const n = { ...v };
      if (erase) delete n[k]; else n[k] = block;
      return n;
    });
  };

  const code = useMemo(() => schemCode(vox), [vox]);
  const file = useMemo(() => toFile(name, vox), [name, vox]);
  const count = Object.keys(vox).length;

  const exportFile = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
    a.download = `${name || "schematic"}.bloxdschem`;
    a.click(); URL.revokeObjectURL(a.href);
  };
  const importFile = async (f?: File) => {
    if (!f) return;
    try {
      const p = JSON.parse(await f.text()) as SchemFile;
      if (p.format !== "bloxdschem") throw new Error();
      setName(p.name || "imported"); setVox(fromFile(p)); toast.success(`Imported ${p.name}`);
    } catch { toast.error("That isn't a BloxdStudio .bloxdschem file"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  // isometric preview
  const iso = useMemo(() => Object.entries(vox).map(([k, b]) => {
    const [x, y, z] = k.split(",").map(Number) as [number, number, number];
    return { x, y, z, b, depth: x + z + y * 0.01 };
  }).sort((a, b) => a.depth - b.depth), [vox]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <section className="glass mt-6 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Schematic name" className="bg-transparent font-display text-sm font-bold outline-none" />
              <div className="text-[11px] text-steel">{count} blocks · {SIZE}×{HEIGHT}×{SIZE} · autosaved</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept=".bloxdschem,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
              <button onClick={() => fileRef.current?.click()} className="btn-ghost rounded-lg px-3 py-2 text-xs">Import file</button>
              <button onClick={exportFile} className="btn-ghost rounded-lg px-3 py-2 text-xs">Export .bloxdschem</button>
              <button onClick={() => setVox({})} className="btn-ghost rounded-lg px-3 py-2 text-xs text-coral">Clear</button>
              <ShareButton kind="schematic" defaultTitle={name} data={file} code={code} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[220px_auto_1fr]">
            <div className="rounded-xl bg-ink/60 p-3 ring-1 ring-inset ring-border">
              <p className="text-[10px] uppercase tracking-[0.18em] text-steel">Blocks</p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {PALETTE.map((p) => (
                  <button key={p.name} title={p.name} aria-label={p.name} onClick={() => { setBlock(p.name); setErase(false); }}
                    className={`aspect-square rounded-md ring-2 ${block === p.name && !erase ? "ring-bright" : "ring-transparent"}`}
                    style={{ background: p.color, boxShadow: "inset 0 -3px 0 oklch(0 0 0 / 25%)" }} />
                ))}
              </div>
              <p className="mt-2 text-xs">{erase ? "Eraser" : block}</p>
              <button onClick={() => setErase((e) => !e)} className={`mt-3 w-full rounded-lg px-3 py-2 text-xs ${erase ? "bg-coral/20 text-coral ring-1 ring-coral/40" : "btn-ghost"}`}>Eraser</button>
              <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-steel">Layer (height)</p>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => setLayer((l) => Math.max(0, l - 1))} className="btn-ghost rounded px-2 py-1 text-xs">−</button>
                <span className="font-display text-2xl font-extrabold">{layer}</span>
                <button onClick={() => setLayer((l) => Math.min(HEIGHT - 1, l + 1))} className="btn-ghost rounded px-2 py-1 text-xs">+</button>
              </div>
            </div>

            <div className="rounded-xl bg-ink/80 p-3 ring-1 ring-inset ring-border">
              <div className="grid select-none gap-px" style={{ gridTemplateColumns: `repeat(${SIZE}, 1.6rem)` }}
                onPointerLeave={() => (painting.current = false)}>
                {Array.from({ length: SIZE * SIZE }, (_, i) => {
                  const x = i % SIZE, z = Math.floor(i / SIZE);
                  const b = vox[`${x},${layer},${z}`];
                  const below = !b && layer > 0 ? vox[`${x},${layer - 1},${z}`] : undefined;
                  return (
                    <div key={i}
                      onPointerDown={(e) => { e.preventDefault(); painting.current = true; paint(x, z); }}
                      onPointerEnter={() => painting.current && paint(x, z)}
                      className="size-[1.6rem] cursor-crosshair rounded-[3px] bg-card"
                      style={b ? { background: COLOR[b], boxShadow: "inset 0 -3px 0 oklch(0 0 0 / 25%)" } : below ? { background: COLOR[below], opacity: 0.2 } : undefined} />
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-steel">Click or drag to paint · faded squares are the layer below</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative h-64 overflow-hidden rounded-xl bg-ink/80 ring-1 ring-inset ring-border">
                <span className="absolute left-3 top-2 text-[10px] uppercase tracking-[0.18em] text-steel">preview</span>
                <div className="absolute left-1/2 top-[70%]">
                  {iso.map((c) => (
                    <div key={`${c.x},${c.y},${c.z}`} className="absolute size-3 rounded-[2px]"
                      style={{ background: COLOR[c.b], left: (c.x - c.z) * 6, top: (c.x + c.z) * 3 - c.y * 7 - 48, boxShadow: "inset 0 -2px 0 oklch(0 0 0 / 30%)" }} />
                  ))}
                </div>
              </div>
              <div className="flex flex-1 flex-col rounded-xl bg-ink/90 p-3 ring-1 ring-inset ring-border">
                <span className="text-[10px] uppercase tracking-[0.18em] text-steel">build code</span>
                <pre className="mt-2 max-h-48 flex-1 overflow-auto text-[11px] text-foreground/85"><code>{code}</code></pre>
                <button onClick={async () => { await navigator.clipboard.writeText(code); toast.success("Build code copied"); }} className="btn-voxel mt-3 rounded-lg px-3 py-2.5 text-sm">⧉ Copy code</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
