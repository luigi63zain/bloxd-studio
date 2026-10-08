import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/* Live toasts for direct messages, party invites and friend requests, on every page. */
export function ChatNotifier() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notify-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient=eq.${user.id}` }, (p) => {
        const m = p.new as { sender_name: string; body: string; kind: string };
        if (window.location.pathname === "/chat") return;
        if (m.kind === "party") toast(`🎮 ${m.sender_name} started a bloxd party!`, { description: "Open Chat to join them." });
        else toast(`💬 ${m.sender_name}`, { description: m.body.slice(0, 80) });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friendships", filter: `addressee=eq.${user.id}` }, () => {
        toast("👋 New friend request", { description: "Open Chat to accept it." });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);
  return null;
}
