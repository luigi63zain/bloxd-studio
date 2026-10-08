import { supabase } from "@/integrations/supabase/client";

export const REACTIONS = [
  { id: "gg", icon: "GG", anim: "react-bounce", label: "GG" },
  { id: "fire", icon: "🔥", anim: "react-flicker", label: "Fire" },
  { id: "diamond", icon: "💎", anim: "react-spin", label: "Diamond" },
  { id: "creeper", icon: "🟩", anim: "react-shake", label: "Creeper" },
  { id: "heart", icon: "❤️", anim: "react-pulse", label: "Heart" },
  { id: "lol", icon: "😂", anim: "react-wobble", label: "LOL" },
] as const;

export type Reaction = { id: string; message_id: string; user_id: string; emoji: string };

export function ReactionBar({ messageId, reactions, me }: { messageId: string; reactions: Reaction[]; me?: string }) {
  const toggle = async (emoji: string) => {
    if (!me) return;
    const mine = reactions.find((r) => r.emoji === emoji && r.user_id === me);
    if (mine) await supabase.from("reactions").delete().eq("id", mine.id);
    else await supabase.from("reactions").insert({ message_id: messageId, user_id: me, emoji });
  };
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {REACTIONS.map((r) => {
        const list = reactions.filter((x) => x.emoji === r.id);
        const mine = list.some((x) => x.user_id === me);
        if (!list.length) return (
          <button key={r.id} title={r.label} onClick={() => toggle(r.id)}
            className="react-chip opacity-0 group-hover:opacity-60 hover:!opacity-100">
            <span className={r.anim}>{r.icon}</span>
          </button>
        );
        return (
          <button key={r.id} title={r.label} onClick={() => toggle(r.id)}
            className={`react-chip ${mine ? "bg-bright/20 ring-bright/50" : ""}`}>
            <span className={r.anim}>{r.icon}</span> <span className="text-[10px]">{list.length}</span>
          </button>
        );
      })}
    </div>
  );
}
