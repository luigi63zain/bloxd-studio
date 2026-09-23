import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
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
function insertInto(nodes: Node[], targetId: string | null, node: Node): Node[] {
  if (!targetId) return [...nodes, node];
  return mapTree(nodes, (n) => (n.id === targetId && n.children ? { ...n, children: [...n.children, node] } : n));
}
function move(nodes: Node[], id: string, dir: -1 | 1): Node[] {
  const i = nodes.findIndex((n) => n.id === id);
  if (i >= 0) {
    const j = i + dir;
    if (j < 0 || j >= nodes.length) return nodes;
    const c = [...nodes];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  }
  return nodes.map((n) => (n.children ? { ...n, children: move(n.children, id, dir) } : n));
}
const count = (ns: Node[]): number => ns.reduce((a, n) => a + 1 + (n.children ? count(n.children) : 0), 0);

function Editor() {
  const [name, setName] = useState("my_build");
  const [scripts, setScripts] = useState<Node[]>(starter);
  const [cat, setCat] = useState<Category>("event");
  const [target, setTarget] = useState<string | null>(null);
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

  const add = (type: string) => {
    const node = makeNode(type);
    if (DEF[type].shape === "hat") { setScripts((s) => [...s, node]); setTarget(node.id); return; }
    const t = target ?? scripts.find((s) => s.children)?.id ?? null;
    if (!t) { toast("Add an event block first"); return; }
    setScripts((s) => insertInto(s, t, node));
  };
  const update = (id: string, key: string, val: string) =>
    setScripts((s) => mapTree(s, (n) => (n.id === id ? { ...n, values: { ...n.values, [key]: val } } : n)));
  const remove = (id: string) => { setScripts((s) => mapTree(s, (n) => (n.id === id ? null : n))); if (target === id) setTarget(null); };

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
      setName(p.name || "imported"); setScripts(p.scripts); setTarget(null);
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
              <button onClick={() => { setScripts([]); setTarget(null); }} className="btn-ghost rounded-lg px-3 py-2 text-xs text-coral">Clear</button>
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
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-steel">Click a block to add it</p>
              <div className="mt-3 flex flex-col gap-3" style={{ ["--notch-bg" as string]: "var(--ink)" }}>
                {BLOCKS.filter((b) => b.category === cat).map((b) => (
                  <button key={b.type} onClick={() => add(b.type)}
                    className={`pblock b-${b.category} ${b.shape === "hat" ? "hat" : ""} text-left transition-transform hover:-translate-y-0.5`}>
                    {b.parts.map((p, i) => typeof p === "string" ? <span key={i}>{p}</span> :
                      <span key={i} className="rounded-full bg-foreground/90 px-2 text-[11px]">{p.default}</span>)}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas */}
            <div className="min-h-[520px] overflow-auto rounded-xl bg-ink/80 p-5 ring-1 ring-inset ring-border"
              style={{ ["--notch-bg" as string]: "var(--ink)" }}>
              {scripts.length === 0 && <p className="text-sm text-steel">Start with an event block from the palette.</p>}
              <div className="flex flex-col gap-8">
                {scripts.map((s) => <BlockView key={s.id} node={s} target={target} setTarget={setTarget} update={update} remove={remove} move={(id, d) => setScripts((x) => move(x, id, d))} />)}
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
  node: Node; target: string | null; setTarget: (id: string) => void;
  update: (id: string, k: string, v: string) => void; remove: (id: string) => void; move: (id: string, d: -1 | 1) => void;
};

function BlockView({ node, target, setTarget, update, remove, move }: ViewProps) {
  const d = DEF[node.type];
  if (!d) return null;
  const selected = target === node.id;
  const head = (
    <div className={`pblock group b-${d.category} ${d.shape === "hat" ? "hat" : ""} ${selected ? "outline-2 outline-offset-2 outline-bright" : ""}`}
      onClick={(e) => { if (node.children) { e.stopPropagation(); setTarget(node.id); } }}>
      {d.parts.map((p, i) => typeof p === "string" ? <span key={i}>{p}</span> : (
        <input key={i} value={node.values[p.key] ?? ""} type={p.kind === "number" ? "number" : "text"}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => update(node.id, p.key, e.target.value)}
          style={{ width: `${Math.max(3, (node.values[p.key] ?? "").length + 2)}ch` }} />
      ))}
      <span className="ml-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {d.shape !== "hat" && <>
          <button aria-label="Move up" onClick={(e) => { e.stopPropagation(); move(node.id, -1); }} className="rounded px-1 hover:bg-ink/20">↑</button>
          <button aria-label="Move down" onClick={(e) => { e.stopPropagation(); move(node.id, 1); }} className="rounded px-1 hover:bg-ink/20">↓</button>
        </>}
        <button aria-label="Delete" onClick={(e) => { e.stopPropagation(); remove(node.id); }} className="rounded px-1 hover:bg-ink/20">✕</button>
      </span>
    </div>
  );
  if (!node.children) return head;
  const kids = (
    <div className="flex flex-col gap-1.5 py-1.5" style={{ ["--notch-bg" as string]: `var(--${catVar(d.category)})` }}>
      {node.children.length === 0 && <div className="h-6 text-[10px] leading-6 text-steel" style={{ paddingLeft: 4 }}>{selected ? "adding blocks here" : "click to add blocks here"}</div>}
      <div className="flex flex-col gap-1.5" style={{ ["--notch-bg" as string]: "var(--ink)" }}>
        {node.children.map((c) => <BlockView key={c.id} node={c} target={target} setTarget={setTarget} update={update} remove={remove} move={move} />)}
      </div>
    </div>
  );
  if (d.shape === "hat") return <div className="flex flex-col gap-1.5">{head}<div className="pl-0">{kids}</div></div>;
  return (
    <div className="flex flex-col">
      {head}
      <div className="flex">
        <div className={`c-arm b-${d.category}`} />
        <div className="pl-1">{kids}</div>
      </div>
      <div className={`c-foot b-${d.category}`} />
    </div>
  );
}

const catVar = (c: Category) => ({ event: "amber", world: "mint", player: "sky", logic: "coral", math: "grape" })[c];
