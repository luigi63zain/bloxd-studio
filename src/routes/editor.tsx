import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { ShareButton } from "@/components/ShareDialog";
import { BLOCKS, CATEGORIES, DEF, generate, makeNode, type Category, type Node } from "@/lib/blocks";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Block Editor — BloxdStudio" },
      { name: "description", content: "Stack puzzle-piece blocks to generate bloxd.io code. Copy it, export it, share it." },
      { property: "og:title", content: "Block Editor — BloxdStudio" },
      { property: "og:description", content: "Visual block coding for bloxd.io with copy, export and import." },
    ],
  }),
  component: Editor,
});

const STORAGE = "bloxdstudio-project";

const starter = (): Node[] => {
  const hat = makeNode("onJoin");
  hat.children = [makeNode("say"), makeNode("give")];
  return [hat];
};

// tree helpers
function mapTree(nodes: Node[], fn: (n: Node) => Node | null): Node[] {
  return nodes.flatMap((n) => {
    const r = fn(n);
    if (!r) return [];
    return [{ ...r, children: r.children ? mapTree(r.children, fn) : undefined }];
  });
}
function find(nodes: Node[], id: string): Node | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const r = n.children && find(n.children, id);
    if (r) return r;
  }
  return null;
}
function locate(nodes: Node[], id: string, parent: string | null): { parent: string | null; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    if (n.id === id) return { parent, index: i };
    const r = n.children && locate(n.children, id, n.id);
    if (r) return r;
  }
  return null;
}
function extract(nodes: Node[], id: string): [Node[], Node | null] {
  const found = find(nodes, id);
  return [mapTree(nodes, (n) => (n.id === id ? null : n)), found];
}
function insertAt(nodes: Node[], parentId: string | null, index: number, node: Node): Node[] {
  if (!parentId) { const c = [...nodes]; c.splice(index, 0, node); return c; }
  return nodes.map((n) => {
    if (n.id === parentId && n.children) { const c = [...n.children]; c.splice(index, 0, node); return { ...n, children: c }; }
    return n.children ? { ...n, children: insertAt(n.children, parentId, index, node) } : n;
  });
}
const count = (ns: Node[]): number => ns.reduce((a, n) => a + 1 + (n.children ? count(n.children) : 0), 0);

function Editor() {
  const [name, setName] = useState("my_build");
  const [scripts, setScripts] = useState<Node[]>(starter);
  const [cat, setCat] = useState<Category>("event");
  const [over, setOver] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) { const p = JSON.parse(raw); setName(p.name); setScripts(p.scripts); }
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE, JSON.stringify({ name, scripts })); }, [name, scripts]);

  const code = useMemo(() => generate(scripts), [scripts]);

  const drop = (e: React.DragEvent, parentId: string | null, index: number) => {
    e.preventDefault(); e.stopPropagation(); setOver(null);
    const v = e.dataTransfer.getData("text/plain");
    setScripts((s) => {
      let tree = s, node: Node | null = null;
      if (v.startsWith("new:")) node = makeNode(v.slice(4));
      else if (v.startsWith("move:")) {
        const id = v.slice(5);
        const found = find(s, id);
        if (!found || (parentId && (parentId === id || find(found.children ?? [], parentId)))) return s;
        // adjust index if moving within same parent and earlier
        const loc = locate(s, id, null);
        if (loc && loc.parent === parentId && loc.index < index) index -= 1;
        [tree, node] = extract(s, id);
      }
      if (!node) return s;
      if (DEF[node.type]?.shape === "hat") parentId = null, index = Math.min(index, tree.length);
      return insertAt(tree, parentId, index, node);
    });
  };
  const update = (id: string, key: string, val: string) =>
    setScripts((s) => mapTree(s, (n) => (n.id === id ? { ...n, values: { ...n.values, [key]: val } } : n)));
  const remove = (id: string) => setScripts((s) => mapTree(s, (n) => (n.id === id ? null : n)));

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true); toast.success("Code copied — paste it into bloxd.io");
    setTimeout(() => setCopied(false), 1500);
  };
  const exportFile = () => {
    const blob = new Blob([JSON.stringify({ app: "BloxdStudio", version: 1, name, scripts }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name || "build"}.bxs`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = async (f?: File) => {
    if (!f) return;
    try {
      const p = JSON.parse(await f.text());
      if (!Array.isArray(p.scripts)) throw new Error();
      setName(p.name || "imported"); setScripts(p.scripts);
      toast.success(`Imported ${p.name}`);
    } catch { toast.error("That file isn't a BloxdStudio project"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <section className="glass mt-6 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="btn-voxel grid size-8 place-items-center rounded-lg text-sm">≡</div>
              <div>
                <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Project name"
                  className="bg-transparent font-display text-sm font-bold outline-none" />
                <div className="text-[11px] text-steel">{count(scripts)} blocks · autosaved</div>
              </div>
            </div>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".bxs,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
              <button onClick={() => fileRef.current?.click()} className="btn-ghost rounded-lg px-3 py-2 text-xs">Import file</button>
              <button onClick={exportFile} className="btn-ghost rounded-lg px-3 py-2 text-xs">Export file</button>
              <ShareButton kind="code" defaultTitle={name} data={{ app: "BloxdStudio", version: 1, name, scripts }} code={code} />
              <button onClick={() => { setScripts([]); }} className="btn-ghost rounded-lg px-3 py-2 text-xs text-coral">Clear</button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[260px_1fr_340px]">
            {/* Palette */}
            <div className="rounded-xl bg-ink/60 p-3 ring-1 ring-inset ring-border">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setCat(c)}
                    className={`rounded-full px-2.5 py-1 text-[11px] capitalize ring-1 ring-inset ${cat === c ? "bg-bright/15 text-bright ring-bright/30" : "text-foreground/70 ring-border"}`}>
                    <span className={`mr-1 inline-block size-2 rounded-full b-${c}`} />{c}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-steel">Drag blocks onto the canvas</p>
              <div className="mt-3 flex flex-col gap-3" style={{ ["--notch-bg" as string]: "var(--ink)" }}>
                {BLOCKS.filter((b) => b.category === cat).map((b) => (
                  <div key={b.type} draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", `new:${b.type}`); e.dataTransfer.effectAllowed = "copy"; }}
                    className={`pblock b-${b.category} ${b.shape === "hat" ? "hat" : ""} cursor-grab transition-transform hover:-translate-y-0.5 active:cursor-grabbing`}>
                    {b.parts.map((p, i) => typeof p === "string" ? <span key={i}>{p}</span> :
                      <span key={i} className="rounded-full bg-foreground/90 px-2 text-[11px]">{p.default}</span>)}
                  </div>
                ))}
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setOver("trash"); }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => { e.preventDefault(); setOver(null); const v = e.dataTransfer.getData("text/plain"); if (v.startsWith("move:")) remove(v.slice(5)); }}
                className={`mt-4 rounded-lg border border-dashed p-3 text-center text-[11px] ${over === "trash" ? "border-coral bg-coral/10 text-coral" : "border-border text-steel"}`}>
                drag here to delete
              </div>
            </div>

            {/* Canvas */}
            <div className={`min-h-[520px] overflow-auto rounded-xl bg-ink/80 p-5 ring-1 ring-inset ${over === "root" ? "ring-bright/50" : "ring-border"}`}
              style={{ ["--notch-bg" as string]: "var(--ink)" }}
              onDragOver={(e) => { e.preventDefault(); if (over !== "root" && e.target === e.currentTarget) setOver("root"); }}
              onDrop={(e) => drop(e, null, scripts.length)}>
              {scripts.length === 0 && <p className="pointer-events-none text-sm text-steel">Drag an event block here to start.</p>}
              <div className="flex flex-col gap-8">
                {scripts.map((s, i) => <BlockView key={s.id} node={s} parentId={null} index={i} over={over} setOver={setOver} update={update} remove={remove} drop={drop} />)}
              </div>
            </div>

            {/* Code */}
            <div className="flex flex-col rounded-xl bg-ink/90 p-3 ring-1 ring-inset ring-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.18em] text-steel">generated</span>
                <span className="text-[10px] text-bright">.js</span>
              </div>
              <pre className="mt-2 max-h-[440px] flex-1 overflow-auto text-[11.5px] leading-relaxed text-foreground/85"><code>{code}</code></pre>
              <button onClick={copy} className="btn-voxel mt-3 rounded-lg px-3 py-2.5 text-sm">{copied ? "✓ Copied!" : "⧉ Copy code"}</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

type ViewProps = {
  node: Node; parentId: string | null; index: number; over: string | null; setOver: (k: string | null) => void;
  update: (id: string, k: string, v: string) => void; remove: (id: string) => void;
  drop: (e: React.DragEvent, parentId: string | null, index: number) => void;
};

function BlockView({ node, parentId, index, over, setOver, update, remove, drop }: ViewProps) {
  const d = DEF[node.type];
  if (!d) return null;
  const afterKey = `after:${node.id}`;
  const head = (
    <div draggable
      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("text/plain", `move:${node.id}`); e.dataTransfer.effectAllowed = "move"; }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(afterKey); }}
      onDragLeave={() => setOver(null)}
      onDrop={(e) => drop(e, node.children && d.shape !== "hat" ? parentId : parentId, index + 1)}
      className={`pblock group cursor-grab active:cursor-grabbing b-${d.category} ${d.shape === "hat" ? "hat" : ""}`}>
      {d.parts.map((p, i) => typeof p === "string" ? <span key={i}>{p}</span> : (
        <input key={i} value={node.values[p.key] ?? ""} type={p.kind === "number" ? "number" : "text"}
          draggable={false} onDragStart={(e) => e.preventDefault()}
          onChange={(e) => update(node.id, p.key, e.target.value)}
          style={{ width: `${Math.max(3, (node.values[p.key] ?? "").length + 2)}ch` }} />
      ))}
      <button aria-label="Delete" onClick={() => remove(node.id)} className="ml-1 rounded px-1 opacity-0 transition-opacity hover:bg-ink/20 group-hover:opacity-100">✕</button>
    </div>
  );
  const indicator = over === afterKey && d.shape !== "hat" ? <div className="h-1 w-44 rounded bg-bright" /> : null;
  if (!node.children) return <div className="flex flex-col gap-1.5">{head}{indicator}</div>;
  const zoneKey = `in:${node.id}`;
  const kids = (
    <div className="flex flex-col gap-1.5 py-1.5" style={{ ["--notch-bg" as string]: "var(--ink)" }}>
      {node.children.map((c, i) => <BlockView key={c.id} node={c} parentId={node.id} index={i} over={over} setOver={setOver} update={update} remove={remove} drop={drop} />)}
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(zoneKey); }}
        onDragLeave={() => setOver(null)}
        onDrop={(e) => drop(e, node.id, node.children!.length)}
        className={`h-7 w-44 rounded-md border border-dashed text-[10px] leading-7 transition-colors ${over === zoneKey ? "border-bright bg-bright/10 text-bright" : "border-border text-steel"}`}
        style={{ paddingLeft: 8 }}>
        drop blocks here
      </div>
    </div>
  );
  // dropping directly on a hat/C header puts the block first inside it
  const headWithInner = (
    <div onDropCapture={(e) => { if (e.target === e.currentTarget.firstChild || (e.currentTarget.firstChild as HTMLElement)?.contains(e.target as HTMLElement)) { drop(e, node.id, 0); } }}>
      {head}
    </div>
  );
  if (d.shape === "hat") return <div className="flex flex-col gap-1.5">{headWithInner}{kids}</div>;
  return (
    <div className="flex flex-col">
      {headWithInner}
      <div className="flex">
        <div className={`c-arm b-${d.category}`} />
        <div className="pl-1">{kids}</div>
      </div>
      <div className={`c-foot b-${d.category}`} />
      {indicator && <div className="mt-1.5">{indicator}</div>}
    </div>
  );
}

const catVar = (c: Category) => ({ event: "amber", world: "mint", player: "sky", logic: "coral", math: "grape" })[c];
