import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Glows, SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BloxdStudio — bloxd.io community hub" },
      { name: "description", content: "Build bloxd.io scripts with snap-together coding blocks, then share them with the community." },
      { property: "og:title", content: "BloxdStudio — bloxd.io community hub" },
      { property: "og:description", content: "Snap-together coding blocks for bloxd.io. Build, copy, and share scripts." },
    ],
  }),
  component: Hub,
});

const BUILDS = [
  { title: "Welcome Kit", tag: "player", author: "rune_forge", blocks: 5, color: "text-sky bg-sky/15 ring-sky/30", tags: ["join", "items"] },
  { title: "Chat Teleporter", tag: "logic", author: "mole_miner", blocks: 4, color: "text-coral bg-coral/15 ring-coral/30", tags: ["chat", "tp"] },
  { title: "Spawn Pillar", tag: "world", author: "kilo_blox", blocks: 3, color: "text-mint bg-mint/15 ring-mint/30", tags: ["build", "loop"] },
  { title: "Score Counter", tag: "math", author: "voxel_9", blocks: 6, color: "text-grape bg-grape/15 ring-grape/30", tags: ["score"] },
  { title: "Server Announcer", tag: "world", author: "zuko_dev", blocks: 2, color: "text-mint bg-mint/15 ring-mint/30", tags: ["broadcast"] },
  { title: "Full Heal Command", tag: "player", author: "pixelpip", blocks: 4, color: "text-sky bg-sky/15 ring-sky/30", tags: ["chat", "health"] },
];

function Hub() {
  const [filter, setFilter] = useState("all");
  const list = BUILDS.filter((b) => filter === "all" || b.tag === filter);
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1200px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <section className="glass mt-8 rounded-2xl p-6 sm:p-8">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Snap code together.<br />Share it with everyone.</h1>
          <p className="mt-3 max-w-lg text-sm text-steel">Stack puzzle-piece blocks to make bloxd.io scripts, copy the code into your world, and trade project files with friends.</p>
          <Link to="/editor" className="btn-voxel mt-6 inline-block rounded-xl px-5 py-3 text-sm">Open the block editor</Link>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold">Fresh drops from the forge</h2>
            <div className="flex gap-2">
              {["all", "world", "player", "logic", "math"].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1.5 text-xs capitalize ring-1 ring-inset ${filter === f ? "bg-bright/15 text-bright ring-bright/30" : "bg-card text-foreground/80 ring-border"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((b) => (
              <article key={b.title} className="glass rounded-xl p-4 transition-transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset ${b.color}`}>{b.tag}</span>
                  <span className="text-[11px] text-steel">{b.blocks} blocks</span>
                </div>
                <h3 className="mt-2 font-display text-lg font-bold">{b.title}</h3>
                <div className="mt-2 text-xs text-foreground/70">by {b.author}</div>
                <div className="mt-2 flex gap-1">
                  {b.tags.map((t) => <span key={t} className="rounded bg-card px-1.5 py-0.5 text-[10px] text-steel">{t}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
