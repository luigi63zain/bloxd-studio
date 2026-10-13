import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { refreshWallet } from "@/hooks/use-wallet";
import { LinkText } from "@/components/LinkText";
import { UserName } from "@/components/UserName";
import { StickerArt, type StickerData } from "@/components/StickerArt";
import type { Wallet } from "@/lib/shop";

type Post = { id: string; user_id: string; author: string; author_rank: string; body: string; created_at: string; sticker: StickerData | null };
type MySticker = { id: string; name: string; pixels: string[] };

export function HubPosts({ limit = 50, title = "Community posts", showMore = false }: { limit?: number; title?: string; showMore?: boolean }) {
  const { user, isOwner } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [wallets, setWallets] = useState<Record<string, Wallet>>({});
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [stickers, setStickers] = useState<MySticker[]>([]);
  const [pick, setPick] = useState<MySticker | null>(null);
  const [picking, setPicking] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("hub_posts").select("id,user_id,author,author_rank,body,created_at,sticker").order("created_at", { ascending: false }).limit(limit);
    const list = (data as unknown as Post[]) ?? [];
    setPosts(list);
    const ids = [...new Set(list.map((p) => p.user_id))];
    if (ids.length) {
      const { data: w } = await supabase.from("wallets").select("*").in("user_id", ids);
      setWallets(Object.fromEntries(((w as Wallet[]) ?? []).map((x) => [x.user_id, x])));
    }
  };
  useEffect(() => {
    if (!user) { setPosts([]); return; }
    void load();
    void supabase.from("stickers").select("id,name,pixels").order("created_at", { ascending: false }).then(({ data }) => setStickers((data as unknown as MySticker[]) ?? []));
  }, [user]);

  const post = async () => {
    if (!user) return;
    const text = body.trim() || (pick ? pick.name : "");
    if (!text) return;
    setBusy(true);
    const { error } = await supabase.from("hub_posts").insert({
      body: text, user_id: user.id, author: "",
      sticker: pick ? ({ name: pick.name, pixels: pick.pixels } as unknown as Json) : null,
    });
    setBusy(false);
    if (error) { toast.error("Couldn't post: " + error.message); return; }
    toast.success("Posted! +5 ULTRACOINS");
    setBody(""); setPick(null); refreshWallet(); void load();
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("hub_posts").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete"); return; }
    setPosts((p) => p.filter((x) => x.id !== id));
  };

  return (
    <section className="glass mt-8 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">{title}</h2>
        {showMore && user && <Link to="/posts" className="text-xs text-bright">See all posts →</Link>}
      </div>
      {user ? (
        <div className="mt-4">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3}
            placeholder="Share an idea, ask a question, or paste a link…" className="w-full rounded-xl bg-background/60 p-3 text-sm ring-1 ring-border outline-none" />
          {pick && (
            <div className="mt-2 flex items-center gap-2 text-xs text-steel">
              <StickerArt pixels={pick.pixels} size={40} /> {pick.name}
              <button aria-label="Remove sticker" onClick={() => setPick(null)} className="hover:text-coral">✕</button>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button disabled={busy || (!body.trim() && !pick)} onClick={post} className="btn-voxel rounded-xl px-5 py-2 text-sm disabled:opacity-50">Post</button>
            <button onClick={() => setPicking(!picking)} className="btn-ghost rounded-xl px-4 py-2 text-sm">🎨 Sticker</button>
            <span className="text-[11px] text-steel">Each post earns 5 ULTRACOINS (up to 20 a day).</span>
          </div>
          {picking && (
            <div className="mt-2 flex flex-wrap gap-2 rounded-xl bg-background/40 p-3 ring-1 ring-border">
              {stickers.length === 0 && <span className="text-xs text-steel">No stickers yet. <Link to="/stickers" className="text-bright underline">Make one</Link>.</span>}
              {stickers.map((s) => (
                <button key={s.id} title={s.name} onClick={() => { setPick(s); setPicking(false); }} className="rounded-lg p-1 ring-1 ring-border hover:ring-bright">
                  <StickerArt pixels={s.pixels} size={44} />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-steel"><Link to="/auth" className="text-bright underline">Sign in</Link> to read and write posts.</p>
      )}
      <div className="mt-5 space-y-3">
        {user && posts.length === 0 && <p className="text-sm text-steel">No posts yet. Be the first!</p>}
        {posts.map((p) => {
          const w = wallets[p.user_id];
          return (
            <div key={p.id} className="rounded-xl bg-background/40 p-4 ring-1 ring-border">
              <div className="flex items-center gap-2 text-xs text-steel">
                <UserName name={p.author} color={w?.name_color} badge={w?.badge} rank={p.author_rank} />
                <span>{new Date(p.created_at).toLocaleString()}</span>
                {user && (user.id === p.user_id || isOwner) && (
                  <button onClick={() => del(p.id)} className="ml-auto hover:text-coral">Delete</button>
                )}
              </div>
              {p.sticker?.pixels && <div className="mt-2"><StickerArt pixels={p.sticker.pixels} size={96} /></div>}
              <div className="mt-2 whitespace-pre-wrap break-words text-sm"><LinkText text={p.body} /></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
