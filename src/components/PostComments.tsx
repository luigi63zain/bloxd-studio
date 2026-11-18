import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LinkText } from "@/components/LinkText";
import { UserName } from "@/components/UserName";
import { EmojiPicker } from "@/lib/emojis";

type Comment = { id: string; user_id: string; author: string; author_rank: string; body: string; created_at: string };

export function PostComments({ postId, me, isStaff }: { postId: string; me: string; isStaff: boolean }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Comment[]>([]);
  const [count, setCount] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [emoji, setEmoji] = useState(false);
  const load = async () => {
    const { data, count: c } = await supabase.from("post_comments").select("id,user_id,author,author_rank,body,created_at", { count: "exact" }).eq("post_id", postId).order("created_at").limit(100);
    setList(data ?? []); setCount(c ?? 0);
  };
  useEffect(() => { void load(); }, [postId]);
  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: me, body: body.trim() });
    setBusy(false);
    if (error) { toast.error("Couldn't comment: " + error.message); return; }
    setBody(""); setEmoji(false); void load();
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("post_comments").delete().eq("id", id);
    if (error) toast.error("Couldn't delete"); else void load();
  };
  return <div className="mt-2">
    <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)}><MessageCircle />{count ? `${count} comment${count === 1 ? "" : "s"}` : "Comment"}</Button>
    {open && <div className="mt-2 space-y-2 border-l border-border pl-3">
      {list.map(c => <div key={c.id} className="text-sm">
        <div className="flex items-center gap-2 text-xs text-steel"><UserName name={c.author} rank={c.author_rank} /><span>{new Date(c.created_at).toLocaleString()}</span>
          {(c.user_id === me || isStaff) && <button onClick={() => void del(c.id)} className="ml-auto hover:text-coral">Delete</button>}</div>
        <div className="whitespace-pre-wrap break-words"><LinkText text={c.body} /></div>
      </div>)}
      <div className="flex gap-2">
        <input aria-label="Write a comment" value={body} maxLength={500} onChange={e => setBody(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void send(); }} placeholder="Write a comment… try :draugrknight:" className="min-w-0 flex-1 rounded-lg bg-background/60 px-3 py-2 text-sm ring-1 ring-border outline-none" />
        <Button size="icon" variant="outline" aria-label="Custom emojis" onClick={() => setEmoji(!emoji)}><Smile /></Button>
        <Button size="sm" disabled={busy || !body.trim()} onClick={() => void send()}>Reply</Button>
      </div>
      {emoji && <EmojiPicker onPick={code => setBody(b => (b ? b + " " : "") + code)} />}
    </div>}
  </div>;
}
