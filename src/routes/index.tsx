import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { HubPosts } from "@/components/HubPosts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "BloxdStudio — bloxd.io community hub" },
      { name: "description", content: "Build bloxd.io scripts and schematics, chat with friends, start parties and share creations." },
      { property: "og:title", content: "BloxdStudio — bloxd.io community hub" },
      { property: "og:description", content: "Snap-together coding, schematics, AI builds, world chat and bloxd parties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Hub,
});

const TOOLS = [
  { to: "/editor", icon: "🧩", title: "Block Code", text: "Snap puzzle blocks into bloxd.io scripts.", tone: "bg-bright/15" },
  { to: "/schematic", icon: "🧱", title: "Schematics", text: "Paint builds layer by layer in 3D.", tone: "bg-amber/15" },
  { to: "/roads", icon: "🛣️", title: "Roads", text: "Draw a path, get a road build.", tone: "bg-sky/15" },
  { to: "/ai", icon: "🤖", title: "AI Generator", text: "Describe it, the AI makes it.", tone: "bg-grape/15" },
  { to: "/forge", icon: "⚒️", title: "The Forge", text: "Browse and remix shared creations.", tone: "bg-coral/15" },
  { to: "/chat", icon: "💬", title: "Chat & Parties", text: "Friends, world chat, play together.", tone: "bg-mint/15" },
] as const;

function Hub() {
  const [stats, setStats] = useState<{ forge: number; posts: number } | null>(null);
  useEffect(() => {
    void Promise.all([
      supabase.from("forge_posts").select("id", { count: "exact", head: true }),
      supabase.from("hub_posts").select("id", { count: "exact", head: true }),
    ]).then(([f, h]) => setStats({ forge: f.count ?? 0, posts: h.count ?? 0 }));
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1200px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <section className="glass float-in mt-8 grid gap-8 rounded-3xl p-8 sm:p-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="rounded-full bg-mint/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-mint">bloxd.io community hub</span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Build it. Share it.<br /><span className="text-bright">Play it together.</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm text-steel">Make bloxd.io scripts and builds with snap-together tools, show them off in the Forge, and jump into parties with your friends.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/editor" className="btn-voxel rounded-xl px-5 py-3 text-sm">Start building</Link>
              <Link to="/chat" className="btn-ghost rounded-xl px-5 py-3 text-sm">▶ Play with friends</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            <Stat n={stats?.forge} label="Forge creations" />
            <Stat n={stats?.posts} label="Community posts" />
            <div className="col-span-2 rounded-2xl bg-background/40 p-4 ring-1 ring-border">
              <div className="text-[11px] uppercase tracking-widest text-steel">Tip</div>
              <p className="mt-1 text-sm">Press <b>Play bloxd</b> in a friend's chat — you both land in the same party.</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t, i) => (
            <Link key={t.to} to={t.to} style={{ animationDelay: `${i * 60}ms` }}
              className="glass float-in group rounded-2xl p-5 transition hover:-translate-y-1 hover:ring-1 hover:ring-bright/40">
              <div className={`grid size-11 place-items-center rounded-xl text-xl ${t.tone} transition group-hover:scale-110`}>{t.icon}</div>
              <div className="mt-3 font-display text-lg font-extrabold">{t.title}</div>
              <p className="text-xs text-steel">{t.text}</p>
            </Link>
          ))}
        </section>

        <HubPosts />
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number | undefined; label: string }) {
  return (
    <div className="rounded-2xl bg-background/40 p-4 ring-1 ring-border">
      <div className="font-display text-3xl font-extrabold">{n ?? "—"}</div>
      <div className="text-[11px] uppercase tracking-widest text-steel">{label}</div>
    </div>
  );
}
