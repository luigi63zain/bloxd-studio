import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { LinkText } from "@/components/LinkText";
import { ReactionBar, type Reaction } from "@/components/Reactions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/chat")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Chat — BloxdStudio" },
      { name: "description", content: "Friend other bloxd.io builders, chat live, and start bloxd parties together." },
      { property: "og:title", content: "Chat — BloxdStudio" },
      { property: "og:description", content: "World chat, friends and bloxd party invites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

type Msg = { id: string; sender: string; recipient: string | null; sender_name: string; sender_is_owner: boolean; kind: string; body: string; created_at: string };
type Friendship = { id: string; requester: string; addressee: string; status: string };

const partyUrl = (code: string) => `https://bloxd.io/?lobby=${code}`;
const newPartyCode = () => "bs" + Math.random().toString(36).slice(2, 8);

function ChatPage() {
  const { user, isOwner } = useAuth();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null); /* null = world chat */
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reacts, setReacts] = useState<Reaction[]>([]);
  const [body, setBody] = useState("");
  const [addName, setAddName] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>({});
  const bottom = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const loadFriends = async () => {
    const { data } = await supabase.from("friendships").select("id, requester, addressee, status");
    const list = (data ?? []) as Friendship[];
    setFriendships(list);
    const ids = [...new Set(list.flatMap((f) => [f.requester, f.addressee]))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, username").in("user_id", ids);
      setNames(Object.fromEntries((profs ?? []).map((p) => [p.user_id, p.username])));
    }
  };

  const loadMsgs = async () => {
    if (!user) return;
    let q = supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(100);
    q = active ? q.or(`and(sender.eq.${user.id},recipient.eq.${active}),and(sender.eq.${active},recipient.eq.${user.id})`) : q.is("recipient", null);
    const { data } = await q;
    const list = ((data ?? []) as Msg[]).reverse();
    setMsgs(list);
    if (list.length) {
      const { data: r } = await supabase.from("reactions").select("id, message_id, user_id, emoji").in("message_id", list.map((m) => m.id));
      setReacts((r ?? []) as Reaction[]);
    } else setReacts([]);
  };

  useEffect(() => { if (user) void loadFriends(); }, [user]);
  useEffect(() => { void loadMsgs(); if (active) setUnread((u) => ({ ...u, [active]: 0 })); }, [user, active]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`chat-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        const m = p.new as Msg;
        const a = activeRef.current;
        const inView = a ? (m.sender === a && m.recipient === user.id) || (m.sender === user.id && m.recipient === a) : m.recipient === null;
        if (inView) setMsgs((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
        else if (m.recipient === user.id) {
          setUnread((u) => ({ ...u, [m.sender]: (u[m.sender] ?? 0) + 1 }));
          toast(m.kind === "party" ? `🎮 ${m.sender_name} started a party!` : `💬 ${m.sender_name}`, { description: m.kind === "party" ? "Open their chat to join." : m.body.slice(0, 80) });
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (p) => {
        setMsgs((list) => list.filter((x) => x.id !== (p.old as Msg).id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, (p) => {
        if (p.eventType === "INSERT") setReacts((r) => [...r, p.new as Reaction]);
        if (p.eventType === "DELETE") setReacts((r) => r.filter((x) => x.id !== (p.old as Reaction).id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => { void loadFriends(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

  const friends = useMemo(() => friendships.filter((f) => f.status === "accepted").map((f) => (f.requester === user?.id ? f.addressee : f.requester)), [friendships, user]);
  const incoming = friendships.filter((f) => f.status === "pending" && f.addressee === user?.id);
  const outgoing = friendships.filter((f) => f.status === "pending" && f.requester === user?.id);

  const send = async (text: string, kind: "text" | "party" = "text") => {
    if (!user || !text.trim()) return false;
    const { error } = await supabase.from("messages").insert({ body: text.trim(), kind, sender: user.id, recipient: active });
    if (error) { toast.error("Couldn't send: " + error.message); return false; }
    return true;
  };

  const addFriend = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("user_id, username").ilike("username", addName.trim()).maybeSingle();
    if (!p) { toast.error("No one has that username"); return; }
    if (p.user_id === user.id) { toast.error("That's you!"); return; }
    const { error } = await supabase.from("friendships").insert({ requester: user.id, addressee: p.user_id });
    if (error) { toast.error(error.code === "23505" ? "You already sent or got a request" : error.message); return; }
    toast.success(`Friend request sent to ${p.username}`); setAddName(""); void loadFriends();
  };

  const playBloxd = async () => {
    const code = newPartyCode();
    if (await send(code, "party")) window.open(partyUrl(code), "_blank", "noopener");
  };

  if (!user) {
    return (
      <Shell><section className="glass mt-8 rounded-2xl p-8 text-center">
        <h1 className="font-display text-3xl font-extrabold">Chat</h1>
        <p className="mt-2 text-sm text-steel"><Link to="/auth" className="text-bright underline">Sign in</Link> to chat and add friends.</p>
      </section></Shell>
    );
  }

  return (
    <Shell>
      <div className="mt-6 grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="glass flex flex-col gap-4 rounded-2xl p-4">
          <button onClick={() => setActive(null)} className={`rounded-xl px-3 py-2.5 text-left text-sm font-bold ${active === null ? "bg-bright/15 text-bright" : "hover:bg-accent"}`}>🌍 World chat</button>
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-widest text-steel">Add friend</div>
            <div className="flex gap-1">
              <input value={addName} onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFriend()} placeholder="username"
                className="min-w-0 flex-1 rounded-lg bg-background/60 px-2.5 py-2 text-xs ring-1 ring-border outline-none" />
              <button onClick={addFriend} disabled={!addName.trim()} className="btn-voxel rounded-lg px-3 text-xs disabled:opacity-50">Add</button>
            </div>
          </div>
          {incoming.length > 0 && (
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-widest text-steel">Requests</div>
              {incoming.map((f) => (
                <div key={f.id} className="float-in mb-1 flex items-center gap-1 text-xs">
                  <span className="flex-1 truncate">{names[f.requester] ?? "player"}</span>
                  <button onClick={async () => { await supabase.from("friendships").update({ status: "accepted" }).eq("id", f.id); void loadFriends(); }} className="rounded-md bg-mint/20 px-2 py-1 text-mint">Accept</button>
                  <button onClick={async () => { await supabase.from("friendships").delete().eq("id", f.id); void loadFriends(); }} className="rounded-md px-2 py-1 text-steel hover:text-coral">✕</button>
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-widest text-steel">Friends</div>
            {friends.length === 0 && <p className="text-xs text-steel">No friends yet — add someone by username.</p>}
            {friends.map((id) => (
              <button key={id} onClick={() => setActive(id)} className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${active === id ? "bg-bright/15 text-bright" : "hover:bg-accent"}`}>
                <span className="grid size-6 place-items-center rounded-md bg-grape/30 text-[11px] font-bold">{(names[id] ?? "?")[0]?.toUpperCase()}</span>
                <span className="flex-1 truncate">{names[id] ?? "player"}</span>
                {!!unread[id] && <span className="rounded-full bg-coral px-1.5 text-[10px] font-bold text-ink">{unread[id]}</span>}
              </button>
            ))}
            {outgoing.map((f) => <div key={f.id} className="px-3 py-1 text-xs text-steel">{names[f.addressee] ?? "player"} · pending</div>)}
          </div>
        </aside>

        <section className="glass flex h-[70vh] flex-col rounded-2xl">
          <header className="flex items-center gap-2 border-b border-border px-5 py-3">
            <h1 className="mr-auto font-display text-lg font-extrabold">{active ? names[active] ?? "Friend" : "🌍 World chat"}</h1>
            {active && (
              <>
                <button onClick={playBloxd} className="btn-voxel rounded-lg px-3 py-2 text-xs">▶ Play bloxd</button>
                <button onClick={async () => {
                  const f = friendships.find((x) => [x.requester, x.addressee].includes(active));
                  if (f && confirm("Remove this friend?")) { await supabase.from("friendships").delete().eq("id", f.id); setActive(null); void loadFriends(); }
                }} className="btn-ghost rounded-lg px-3 py-2 text-xs">Unfriend</button>
              </>
            )}
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {msgs.length === 0 && <p className="text-center text-sm text-steel">No messages yet. Say hi!</p>}
            {msgs.map((m) => (
              <div key={m.id} className="group float-in">
                <div className="flex items-center gap-2 text-[11px] text-steel">
                  <span className="font-bold text-foreground">{m.sender_name}</span>
                  {m.sender_is_owner && <span className="rounded-full bg-amber/20 px-1.5 text-[9px] font-bold uppercase text-amber">★ Owner</span>}
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {(m.sender === user.id || isOwner) && (
                    <button onClick={() => supabase.from("messages").delete().eq("id", m.id)} className="opacity-0 group-hover:opacity-100 hover:text-coral">delete</button>
                  )}
                </div>
                {m.kind === "party" ? (
                  <div className="mt-1 inline-flex items-center gap-3 rounded-xl bg-mint/10 px-4 py-3 ring-1 ring-mint/30">
                    <span className="text-2xl react-pulse">🎮</span>
                    <div className="text-sm">
                      <div className="font-bold">{m.sender === user.id ? "You started a bloxd party" : `${m.sender_name} started a bloxd party`}</div>
                      <div className="text-[11px] text-steel">Party code {m.body}</div>
                    </div>
                    <a href={partyUrl(m.body)} target="_blank" rel="noopener noreferrer" className="btn-voxel rounded-lg px-3 py-2 text-xs">Join party</a>
                  </div>
                ) : (
                  <div className="mt-0.5 whitespace-pre-wrap break-words text-sm"><LinkText text={m.body} /></div>
                )}
                <ReactionBar messageId={m.id} reactions={reacts.filter((r) => r.message_id === m.id)} me={user.id} />
              </div>
            ))}
            <div ref={bottom} />
          </div>
          <form onSubmit={async (e) => { e.preventDefault(); if (await send(body)) setBody(""); }} className="flex gap-2 border-t border-border p-3">
            <input value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder={active ? "Message your friend… (links work too)" : "Say something to everyone…"}
              className="flex-1 rounded-xl bg-background/60 px-3 py-2.5 text-sm ring-1 ring-border outline-none" />
            <button disabled={!body.trim()} className="btn-voxel rounded-xl px-5 text-sm disabled:opacity-50">Send</button>
          </form>
        </section>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1200px] px-5 py-6 sm:px-8">
        <SiteHeader />
        {children}
      </div>
    </div>
  );
}
