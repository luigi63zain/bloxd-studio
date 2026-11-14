import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { fromFile, type SchemFile } from "@/lib/schem";
import { downloadBloxdschem } from "@/lib/bloxdschem";
import { ForgeCreate } from "@/components/ForgeCreate";
import { Button } from "@/components/ui/button";
import { UserName } from "@/components/UserName";
import { useAuth } from "@/hooks/use-auth";
import { Plus } from "lucide-react";
import { withCodeCredit } from "@/lib/code-credit";

export const Route = createFileRoute("/forge")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "The Forge — BloxdStudio" },
      { name: "description", content: "Browse, copy and remix bloxd.io codes and schematics shared by the community." },
      { property: "og:title", content: "The Forge — BloxdStudio" },
      { property: "og:description", content: "Community-shared bloxd.io codes and .bloxdschem builds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Forge,
});

type Post = Tables<"forge_posts">;

function Forge() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<"all" | "code" | "schematic" | "texture">("all");
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
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCreating(true)}><Plus />Create +</Button>
            {(["all", "code", "schematic", "texture"] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1.5 text-xs capitalize ring-1 ring-inset ${kind === k ? "bg-bright/15 text-bright ring-bright/30" : "bg-card text-foreground/80 ring-border"}`}>{k === "texture" ? "Texture packs" : k}</button>
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
                <div className="text-xs text-foreground/70">by <UserName name={p.author} rank={p.author_rank} /></div>
                {p.description && <p className="mt-2 line-clamp-2 text-xs text-steel">{p.description}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
      {creating && <ForgeCreate onClose={() => setCreating(false)} onCreated={() => void queryClient.invalidateQueries({ queryKey: ["forge"] })} />}
      {open && <PostModal post={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [working, setWorking] = useState(false);
  const record = async (action: "use" | "remix") => {
    if (!user) return;
    const { error } = await supabase.rpc("record_forge_action", { _post: post.id, _action: action });
    if (error) toast.error("Reward could not be recorded: " + error.message);
  };
  const download = async () => {
    setWorking(true);
    try {
      if (post.file_path) {
        const { data, error } = await supabase.storage.from("forge-files").download(post.file_path);
        if (error) throw error;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(data); a.download = post.file_name ?? `${post.title}.zip`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } else if (post.kind === "schematic") {
        const f = post.data as unknown as SchemFile;
        downloadBloxdschem(post.title, fromFile(f), f.size ?? [16, 16, 16]);
      } else {
        const project = post.data as { scripts?: unknown };
        const a = document.createElement("a");
        const isProject = Array.isArray(project.scripts);
        a.href = URL.createObjectURL(new Blob([isProject ? JSON.stringify(post.data, null, 2) : withCodeCredit(post.code)], { type: isProject ? "application/json" : "text/javascript" }));
        a.download = `${post.title}.${isProject ? 'bxs' : 'js'}`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
      await record("use");
    } catch (error) { toast.error((error as {message: string}).message); }
    finally { setWorking(false); }
  };
  const remix = async () => {
    setWorking(true);
    try {
      if (post.kind === "code") {
        const d = post.data as { scripts?: unknown };
        if (!Array.isArray(d.scripts)) { await navigator.clipboard.writeText(withCodeCredit(post.code)); toast.success("Copied for remixing"); await record("remix"); return; }
        localStorage.setItem("bloxdstudio-project", JSON.stringify({ name: post.title, scripts: d.scripts }));
        await record("remix"); await navigate({ to: "/editor" });
      } else if (post.kind === "schematic") {
        localStorage.setItem("bloxdstudio-schem", JSON.stringify({ name: post.title, vox: fromFile(post.data as unknown as SchemFile) }));
        await record("remix"); await navigate({ to: "/schematic" });
      } else {
        const { data, error } = post.file_path ? await supabase.storage.from("forge-files").download(post.file_path) : {data: null, error: new Error("No texture file")};
        if (error || !data) throw error ?? new Error("No texture file");
        const a = document.createElement("a"); a.href = URL.createObjectURL(data); a.download = post.file_name ?? "textures.zip"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        await record("remix");
      }
    } catch(error) { toast.error((error as {message: string}).message); }
    finally { setWorking(false); }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4" onClick={onClose}>
      <div className="glass w-full max-w-2xl rounded-2xl bg-popover p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-extrabold">{post.title}</h2>
            <p className="text-xs text-steel">{post.kind} · by <UserName name={post.author} rank={post.author_rank} /></p>
          </div>
          <button onClick={onClose} aria-label="Close" className="btn-ghost rounded px-2 py-1 text-xs">✕</button>
        </div>
        {post.description && <p className="mt-3 text-sm text-foreground/80">{post.description}</p>}
        {post.kind !== "texture" && <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-ink/90 p-3 text-[11px] text-foreground/85 ring-1 ring-inset ring-border"><code>{withCodeCredit(post.code)}</code></pre>}
        {post.kind === "texture" && <p className="mt-4 break-all text-sm text-steel">{post.file_name ?? "Texture pack"}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button disabled={working} variant="outline" onClick={() => void download()}>Download file</Button>
          <Button disabled={working} variant="outline" onClick={() => void remix()}>{post.kind === "texture" ? "Download & remix" : post.kind === "code" && !Array.isArray((post.data as {scripts?: unknown}).scripts) ? "Copy for remix" : "Open & remix"}</Button>
          {post.kind !== "texture" && <Button onClick={async () => { try { await navigator.clipboard.writeText(withCodeCredit(post.code)); toast.success("Code copied"); await record("use"); } catch { toast.error("Could not copy code"); } }}>⧉ Copy code</Button>}
        </div>
      </div>
    </div>
  );
}
