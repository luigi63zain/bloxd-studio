import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LinkText } from "@/components/LinkText";

type Post = { id: string; user_id: string; author: string; author_is_owner: boolean; body: string; created_at: string };

export function HubPosts() {
  const { user, isOwner } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("hub_posts").select("*").order("created_at", { ascending: false }).limit(50);
    setPosts((data as Post[]) ?? []);
  };
  useEffect(() => { if (user) void load(); else setPosts([]); }, [user]);

  const post = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("hub_posts").insert({ body: body.trim(), user_id: user.id, author: "" });
    setBusy(false);
    if (error) { toast.error("Couldn't post: " + error.message); return; }
    setBody(""); void load();
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("hub_posts").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete"); return; }
    setPosts((p) => p.filter((x) => x.id !== id));
  };

  return (
    <section className="glass mt-8 rounded-2xl p-6">
      <h2 className="font-display text-2xl font-extrabold">Community posts</h2>
      {user ? (
        <div className="mt-4">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3}
            placeholder="Share an idea, ask a question, or paste a link…" className="w-full rounded-xl bg-background/60 p-3 text-sm ring-1 ring-border outline-none" />
          <button disabled={busy || !body.trim()} onClick={post} className="btn-voxel mt-2 rounded-xl px-5 py-2 text-sm disabled:opacity-50">Post</button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-steel"><Link to="/auth" className="text-bright underline">Sign in</Link> to read and write posts.</p>
      )}
      <div className="mt-5 space-y-3">
        {user && posts.length === 0 && <p className="text-sm text-steel">No posts yet. Be the first!</p>}
        {posts.map((p) => (
          <div key={p.id} className="rounded-xl bg-background/40 p-4 ring-1 ring-border">
            <div className="flex items-center gap-2 text-xs text-steel">
              <span className="font-bold text-foreground">{p.author}</span>
              {p.author_is_owner && <span className="rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber">★ Owner</span>}
              <span>{new Date(p.created_at).toLocaleString()}</span>
              {user && (user.id === p.user_id || isOwner) && (
                <button onClick={() => del(p.id)} className="ml-auto hover:text-coral">Delete</button>
              )}
            </div>
            <div className="mt-2 whitespace-pre-wrap break-words text-sm"><LinkText text={p.body} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
