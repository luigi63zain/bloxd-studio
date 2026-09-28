import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { user, isOwner, profile } = useAuth();
  return (
    <header className="flex items-center justify-between gap-4">
      <Link to="/" className="flex items-center gap-3">
        <div className="btn-voxel grid size-11 place-items-center rounded-xl font-display text-lg font-extrabold">B</div>
        <div>
          <div className="font-display text-xl font-extrabold leading-none tracking-tight">BloxdStudio</div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-steel">community hub</div>
        </div>
      </Link>
      <nav className="flex items-center gap-1">
        {([["/", "Hub"], ["/editor", "Code"], ["/schematic", "Schematics"], ["/roads", "Roads"], ["/forge", "Forge"], ["/ai", "AI"]] as const).map(([to, label]) => (
          <Link key={to} to={to} activeOptions={{ exact: true }}
            className="rounded-full px-4 py-2 text-sm text-steel"
            activeProps={{ className: "bg-bright/15 !text-bright ring-1 ring-inset ring-bright/30" }}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <Link to="/account" className="text-xs text-steel hover:text-bright">{profile?.username ?? user.email}</Link>
            {isOwner && <span className="rounded-full bg-amber/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber ring-1 ring-inset ring-amber/40">★ Owner</span>}
            <button onClick={() => supabase.auth.signOut()} className="btn-ghost rounded-lg px-3 py-2 text-xs">Sign out</button>
          </>
        ) : (
          <Link to="/auth" className="btn-ghost rounded-lg px-3 py-2 text-xs">Sign in</Link>
        )}
        <Link to="/editor" className="btn-voxel rounded-xl px-4 py-2.5 text-sm">+ New build</Link>
      </div>
    </header>
  );
}

export function Glows() {
  return (
    <div className="pointer-events-none fixed inset-0">
      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-bright/10 blur-[120px]" />
      <div className="absolute -right-32 top-1/3 h-[460px] w-[460px] rounded-full bg-coral/10 blur-[120px]" />
      <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-grape/10 blur-[120px]" />
    </div>
  );
}
