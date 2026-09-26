import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";

type Props = { kind: "code" | "schematic"; defaultTitle: string; data: unknown; code: string };

export function ShareButton(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-voxel rounded-lg px-3 py-2 text-xs">Share to Forge</button>
      {open && <ShareDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareDialog({ kind, defaultTitle, data, code, onClose }: Props & { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState(defaultTitle);
  const [author, setAuthor] = useState(() => (typeof window !== "undefined" && localStorage.getItem("bloxdstudio-author")) || "");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.error("Give it a name"); return; }
    setBusy(true);
    if (!user) localStorage.setItem("bloxdstudio-author", author);
    const { error } = await supabase.from("forge_posts").insert({
      kind, title: title.trim().slice(0, 80), author: (author.trim() || "anonymous").slice(0, 40),
      description: description.trim().slice(0, 500), data: data as Json, code,
    });
    setBusy(false);
    if (error) { toast.error(error.message.includes("belongs to an account") ? "That username belongs to an account. Sign in to use it." : "Could not share it, try again"); return; }
    toast.success("Shared to the Forge!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4" onClick={onClose}>
      <div className="glass w-full max-w-md rounded-2xl bg-popover p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-extrabold">Share to the Forge</h2>
        <p className="mt-1 text-xs text-steel">Everyone can see and use what you share.</p>
        <label className="mt-4 block text-[11px] uppercase tracking-[0.18em] text-steel">Name</label>
        <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-inset ring-border outline-none" />
        <label className="mt-3 block text-[11px] uppercase tracking-[0.18em] text-steel">Your username</label>
        {user ? (
          <div className="mt-1 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-inset ring-border">{profile?.username ?? "…"}</div>
        ) : (
          <input value={author} maxLength={40} placeholder="anonymous" onChange={(e) => setAuthor(e.target.value)} className="mt-1 w-full rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-inset ring-border outline-none" />
        )}
        <label className="mt-3 block text-[11px] uppercase tracking-[0.18em] text-steel">Description</label>
        <textarea value={description} maxLength={500} rows={3} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-inset ring-border outline-none" />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost rounded-lg px-3 py-2 text-xs">Cancel</button>
          <button disabled={busy} onClick={submit} className="btn-voxel rounded-lg px-4 py-2 text-xs">{busy ? "Sharing…" : "Share"}</button>
        </div>
      </div>
    </div>
  );
}
