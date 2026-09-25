import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — BloxdStudio" },
      { name: "description", content: "Sign in or create a BloxdStudio account with your email." },
      { property: "og:title", content: "Sign in — BloxdStudio" },
      { property: "og:description", content: "Join the BloxdStudio bloxd.io community hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm your account!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else { toast.success("Signed in!"); navigate({ to: "/" }); }
    }
    setBusy(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <form onSubmit={submit} className="glass mx-auto mt-16 flex max-w-sm flex-col gap-3 rounded-2xl p-6">
          <h1 className="font-display text-2xl font-extrabold">{mode === "in" ? "Sign in" : "Create account"}</h1>
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg bg-ink/60 px-3 py-2.5 text-sm outline-none ring-1 ring-inset ring-border focus:ring-bright/50" />
          <input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg bg-ink/60 px-3 py-2.5 text-sm outline-none ring-1 ring-inset ring-border focus:ring-bright/50" />
          <button disabled={busy} className="btn-voxel rounded-lg px-3 py-2.5 text-sm">{busy ? "..." : mode === "in" ? "Sign in" : "Sign up"}</button>
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="text-xs text-steel">
            {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
