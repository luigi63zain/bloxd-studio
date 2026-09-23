import { Link } from "@tanstack/react-router";

export function SiteHeader() {
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
        {([["/", "Hub"], ["/editor", "Code"], ["/schematic", "Schematics"], ["/forge", "Forge"]] as const).map(([to, label]) => (
          <Link key={to} to={to} activeOptions={{ exact: true }}
            className="rounded-full px-4 py-2 text-sm text-steel"
            activeProps={{ className: "bg-bright/15 !text-bright ring-1 ring-inset ring-bright/30" }}>
            {label}
          </Link>
        ))}
      </nav>
      <Link to="/editor" className="btn-voxel rounded-xl px-4 py-2.5 text-sm">+ New build</Link>
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
