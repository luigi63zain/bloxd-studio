import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { fromFile, type SchemFile } from "@/lib/schem";

export const Route = createFileRoute("/forge")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "The Forge — BloxdStudio" },
      { name: "description", content: "Browse, copy and remix bloxd.io codes and schematics shared by the community." },
      { property: "og:title", content: "The Forge — BloxdStudio" },
      { property: "og:description", content: "Community-shared bloxd.io codes and .bloxdschem builds." },
    ],
  }),
  component: Forge,
});

type Post = Tables<"forge_posts">;

function Forge() {
  const [kind, setKind] = useState<"all" | "code" | "schematic">("all");
  const [open, setOpen] = useState<Post | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["forge", kind],
    queryFn: async () => {
      let q = supabase.from("forge_posts").select("*").order("created_at", { ascending: false }).limit(60);
      if (kind !== "all") q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1200px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">The Forge</h1>
            <p className="mt-1 text-sm text-steel">Codes and schematics shared by builders. Open one to look, copy or remix.</p>
          </div>
          <div className="flex gap-2">
            {(["all", "code", "schematic"] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1.5 text-xs capitalize ring-1 ring-inset ${kind === k ? "bg-bright/15 text-bright ring-bright/30" : "bg-card text-foreground/80 ring-border"}`}>{k}</button>
            ))}
          </div>
        </div>

        {isLoading ? <p className="mt-8 text-sm text-steel">Loading…</p> : !data?.length ? (
          <div className="glass mt-8 rounded-2xl p-8 text-center">
            <h2 className="font-display text-2xl font-extrabold">Nothing here yet</h2>
            <p className="mt-2 text-sm text-steel">Be the first — make something and press Share to Forge.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => (
              <button key={p.id} onClick={() => setOpen(p)} className="glass rounded-xl p-4 text-left transition-transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset ${p.kind === "code" ? "bg-amber/15 text-amber ring-amber/30" : "bg-mint/15 text-mint ring-mint/30"}`}>{p.kind}</span>
                  <span className="text-[11px] text-steel">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                <h3 className="mt-2 font-display text-lg font-bold">{p.title}</h3>
                <div className="text-xs text-foreground/70">by {p.author}{p.author_is_owner && <span className="ml-1.5 rounded-full bg-amber/20 px-1.5 py-0.5 text-[10px] font-bold text-amber">★ Owner</span>}</div>
                {p.description && <p className="mt-2 line-clamp-2 text-xs text-steel">{p.description}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
      {open && <PostModal post={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const navigate = useNavigate();
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(post.data, null, 2)], { type: "application/json" }));
    a.download = `${post.title}.${post.kind === "code" ? "bxs" : "bloxdschem"}`;
    a.click(); URL.revokeObjectURL(a.href);
  };
  const remix = () => {
    if (post.kind === "code") {
      const d = post.data as { scripts?: unknown };
      localStorage.setItem("bloxdstudio-project", JSON.stringify({ name: post.title, scripts: d.scripts ?? [] }));
      navigate({ to: "/editor" });
    } else {
      localStorage.setItem("bloxdstudio-schem", JSON.stringify({ name: post.title, vox: fromFile(post.data as unknown as SchemFile) }));
      navigate({ to: "/schematic" });
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4" onClick={onClose}>
      <div className="glass w-full max-w-2xl rounded-2xl bg-popover p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-extrabold">{post.title}</h2>
            <p className="text-xs text-steel">{post.kind} · by {post.author}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="btn-ghost rounded px-2 py-1 text-xs">✕</button>
        </div>
        {post.description && <p className="mt-3 text-sm text-foreground/80">{post.description}</p>}
        <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-ink/90 p-3 text-[11px] text-foreground/85 ring-1 ring-inset ring-border"><code>{post.code}</code></pre>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button onClick={download} className="btn-ghost rounded-lg px-3 py-2 text-xs">Download file</button>
          <button onClick={remix} className="btn-ghost rounded-lg px-3 py-2 text-xs">Open & remix</button>
          <button onClick={async () => { await navigator.clipboard.writeText(post.code); toast.success("Code copied"); }} className="btn-voxel rounded-lg px-3 py-2 text-xs">⧉ Copy code</button>
        </div>
      </div>
    </div>
  );
}
