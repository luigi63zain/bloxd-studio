import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { refreshWallet } from "@/hooks/use-wallet";

/* Marks the signed-in player as online and keeps their daily streak going. */
export function Presence() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const beat = async () => { await supabase.rpc("heartbeat"); refreshWallet(); };
    void beat();
    const t = setInterval(beat, 60000);
    return () => clearInterval(t);
  }, [user]);
  return null;
}
