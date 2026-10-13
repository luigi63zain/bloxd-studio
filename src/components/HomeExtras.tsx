import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { UserName } from "@/components/UserName";

type Game = { id: string; title: string; description: string; image_url: string; link: string };
type Online = { user_id: string; username: string; name_color: string; badge: string; streak: number; rank: string };

export function FeaturedGames() {
  const { isOwner } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [f, setF] = useState({ title: "", description: "", image_url: "", link: "https://bloxd.io/" });
  const load = async () => {
    const { data } = await supabase.from("featured_games").select("*").order("created_at", { ascending: false }).limit(12);
    setGames((data as Game[]) ?? []);
  };
  useEffect(() => { void load(); }, []);

  const add = async () => {
    const { error } = await supabase.from("featured_games").insert({ ...f, title: f.title.trim(), link: f.link.trim(), image_url: f.image_url.trim() });
    if (error) { toast.error("Couldn't add: links must start with https://bloxd.io and pictures with https://"); return; }
    setF({ title: "", description: "", image_url: "", link: "https://bloxd.io/" }); void load();
  };
  const del = async (id: string) => { await supabase.from("featured_games").delete().eq("id", id); void load(); };

  if (!games.length && !isOwner) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-extrabold">⭐ Featured games</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <div key={g.id} className="glass overflow-hidden rounded-2xl">
            {g.image_url && <img src={g.image_url} alt={g.title} loading="lazy" className="aspect-video w-full object-cover" />}
            <div className="p-4">
              <div className="font-display text-lg font-extrabold">{g.title}</div>
              {g.description && <p className="text-xs text-steel">{g.description}</p>}
              <div className="mt-3 flex gap-2">
                <a href={g.link} target="_blank" rel="noreferrer" className="btn-voxel rounded-lg px-4 py-2 text-xs">▶ Play</a>
                {isOwner && <button onClick={() => del(g.id)} className="btn-ghost rounded-lg px-3 py-2 text-xs">Remove</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {isOwner && (
        <div className="glass mt-3 grid gap-2 rounded-2xl p-4 sm:grid-cols-2">
          <div className="text-xs font-bold uppercase tracking-widest text-amber sm:col-span-2">Owner: add a featured game</div>
          {(["title", "link", "image_url", "description"] as const).map((k) => (
            <input key={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
              placeholder={{ title: "Game name", link: "bloxd.io link", image_url: "Picture link (optional)", description: "Short description" }[k]}
              className="rounded-lg bg-background/60 px-3 py-2 text-sm ring-1 ring-border outline-none" />
          ))}
          <button onClick={add} disabled={!f.title.trim()} className="btn-voxel rounded-lg px-4 py-2 text-xs disabled:opacity-50 sm:col-span-2">Feature it</button>
        </div>
      )}
    </section>
  );
}

export function OnlineNow() {
  const [list, setList] = useState<Online[]>([]);
  useEffect(() => {
    const load = async () => { const { data } = await supabase.rpc("online_players"); setList((data as Online[]) ?? []); };
    void load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 font-display text-lg font-extrabold">
        <span className="size-2.5 animate-pulse rounded-full bg-mint" /> Online now <span className="text-sm text-steel">({list.length})</span>
      </div>
      <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-auto text-sm">
        {list.length === 0 && <p className="text-xs text-steel">Nobody yet — sign in to show up here.</p>}
        {list.map((o) => (
          <div key={o.user_id} className="flex items-center justify-between">
            <UserName name={o.username} color={o.name_color} badge={o.badge} rank={o.rank} />
            {o.streak > 0 && <span className="text-xs text-amber">🔥 {o.streak}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
