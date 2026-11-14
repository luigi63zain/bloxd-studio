import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { refreshWallet } from "@/hooks/use-wallet";
import { LinkText } from "@/components/LinkText";
import { UserName } from "@/components/UserName";
import { StickerArt, type StickerData } from "@/components/StickerArt";
import { Button } from "@/components/ui/button";
import { ImagePlus, X } from "lucide-react";
import { mediaKind } from "@/lib/social-rules";
import { PostMedia } from "@/components/PostMedia";
import { PostReactions, type PostReaction } from "@/components/PostReactions";
import type { Wallet } from "@/lib/shop";

type Post = { id: string; user_id: string; author: string; author_rank: string; body: string; created_at: string; sticker: StickerData | null; media_path: string | null; media_type: string | null };
type MySticker = { id: string; name: string; pixels: string[] };

export function HubPosts({ limit = 50, title = "Community posts", showMore = false }: { limit?: number; title?: string; showMore?: boolean }) {
  const { user, isStaff } = useAuth();
  const generation = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<File | null>(null);
  const [reactions, setReactions] = useState<PostReaction[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [wallets, setWallets] = useState<Record<string, Wallet>>({});
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [stickers, setStickers] = useState<MySticker[]>([]);
  const [pick, setPick] = useState<MySticker | null>(null);
  const [picking, setPicking] = useState(false);

  const load = async () => {
    if (!user) return;
    const version = generation.current;
    const { data } = await supabase.from("hub_posts").select("id,user_id,author,author_rank,body,created_at,sticker,media_path,media_type").order("created_at", { ascending: false }).limit(limit);
    const list = (data as unknown as Post[]) ?? [];
    if (version !== generation.current) return;
    setPosts(list);
    if (list.length) {
      const { data: r } = await supabase.from("post_reactions").select("id,post_id,user_id,emoji").in("post_id", list.map(p => p.id));
      if (version !== generation.current) return;
      setReactions(r ?? []);
    } else setReactions([]);
    const ids = [...new Set(list.map((p) => p.user_id))];
    if (ids.length) {
      const { data: w } = await supabase.rpc("public_looks", { _ids: ids });
      if (version !== generation.current) return;
      setWallets(Object.fromEntries(((w as unknown as Wallet[]) ?? []).map((x) => [x.user_id, x])));
    }
  };
  useEffect(() => {
    generation.current++;
    setPosts([]); setWallets({}); setReactions([]); setStickers([]); setPick(null); setMedia(null);
    if (!user) return;
    const version = generation.current;
    void load();
    void supabase.from("stickers").select("id,name,pixels").order("created_at", { ascending: false }).then(({ data }) => { if (version === generation.current) setStickers((data as unknown as MySticker[]) ?? []); });
    const timer = setInterval(() => void load(), 15000);
    return () => { generation.current++; clearInterval(timer); };
  }, [user]);

  const post = async () => {
    if (!user) return;
    const text = body.trim() || (pick ? pick.name : media?.name ?? "");
    if (!text) return;
    setBusy(true);
    let path: string | null = null;
    try {
      const kind = media ? mediaKind(media) : null;
      if (media) {
        path = `${user.id}/${crypto.randomUUID()}.${media.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'bin'}`;
        const { error } = await supabase.storage.from('post-media').upload(path, media, { contentType: media.type });
        if (error) throw error;
      }
      const { error } = await supabase.from("hub_posts").insert({
        body: text, user_id: user.id, author: "", media_path: path, media_type: kind,
        sticker: pick ? ({ name: pick.name, pixels: pick.pixels } as unknown as Json) : null,
      });
      if (error) throw error;
      toast.success("Posted!"); setBody(""); setPick(null); setMedia(null); refreshWallet(); void load();
    } catch (error) {
      if (path) await supabase.storage.from('post-media').remove([path]);
      toast.error("Couldn't post: " + (error as { message: string }).message);
    } finally { setBusy(false); }
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
            <Button disabled={busy || (!body.trim() && !pick && !media)} onClick={post}>{busy ? 'Posting…' : 'Post'}</Button>
            <input ref={fileInput} aria-label="Post media" type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/ogg" hidden onChange={e => {
              const file = e.target.files?.[0]; e.target.value = '';
              if (!file) return;
              try { mediaKind(file); setMedia(file); } catch(error) { toast.error((error as Error).message); }
            }} />
            <Button variant="outline" onClick={() => fileInput.current?.click()}><ImagePlus />Image / GIF / video</Button>
            <button onClick={() => setPicking(!picking)} className="btn-ghost rounded-xl px-4 py-2 text-sm">🎨 Sticker</button>
            <span className="text-[11px] text-steel">Each post earns 5 ULTRACOINS (up to 20 a day).</span>
          </div>
          {media && <div className="mt-3 flex items-center gap-2 text-xs text-steel"><span className="min-w-0 break-all">{media.name}</span><Button variant="ghost" size="icon" aria-label="Remove attachment" onClick={() => setMedia(null)}><X /></Button></div>}
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
                {user && (user.id === p.user_id || isStaff) && (
                  <button onClick={() => del(p.id)} className="ml-auto hover:text-coral">Delete</button>
                )}
              </div>
              {p.sticker?.pixels && <div className="mt-2"><StickerArt pixels={p.sticker.pixels} size={96} /></div>}
              <div className="mt-2 whitespace-pre-wrap break-words text-sm"><LinkText text={p.body} /></div>
               {user && <PostReactions postId={p.id} reactions={reactions.filter(r => r.post_id === p.id)} me={user.id} onChange={() => { void load(); refreshWallet(); }} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
