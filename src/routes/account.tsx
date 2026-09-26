import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — BloxdStudio" },
      { name: "description", content: "Change your BloxdStudio username." },
      { property: "og:title", content: "Your account — BloxdStudio" },
      { property: "og:description", content: "Manage your BloxdStudio username." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Account,
});

const DAY = 86400000;

function Account() {
  const { user, profile, isOwner, refresh } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (profile) setName(profile.username); }, [profile]);

  const next = profile?.username_changed_at ? new Date(new Date(profile.username_changed_at).getTime() + 15 * DAY) : null;
  const locked = !!next && next.getTime() > Date.now();

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ username: name.trim() }).eq("user_id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("profiles_username_lower") ? "That username is taken" : error.message);
      return;
    }
    toast.success("Username changed!");
    await refresh();
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <div className="glass mx-auto mt-16 flex max-w-sm flex-col gap-3 rounded-2xl p-6">
          <h1 className="font-display text-2xl font-extrabold">Your account</h1>
          {!user ? (
            <p className="text-sm text-steel"><Link to="/auth" className="text-bright">Sign in</Link> to set your username.</p>
          ) : (
            <>
              <p className="text-xs text-steel">{user.email}{isOwner && " · ★ Owner"}</p>
              <label className="text-[11px] uppercase tracking-[0.18em] text-steel">Username</label>
              <input value={name} maxLength={20} disabled={locked} onChange={(e) => setName(e.target.value)}
                className="rounded-lg bg-ink/60 px-3 py-2.5 text-sm outline-none ring-1 ring-inset ring-border focus:ring-bright/50 disabled:opacity-60" />
              <p className="text-xs text-steel">
                {locked ? `You can change it again on ${next!.toLocaleDateString()}.` : "3-20 letters, numbers or _. You can change it once every 15 days."}
              </p>
              <button disabled={busy || locked || !name.trim() || name.trim() === profile?.username} onClick={save}
                className="btn-voxel rounded-lg px-3 py-2.5 text-sm disabled:opacity-50">{busy ? "Saving…" : "Save username"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
