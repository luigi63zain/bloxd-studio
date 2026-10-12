import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Wallet } from "@/lib/shop";

export const refreshWallet = () => window.dispatchEvent(new Event("wallet-refresh"));

export function useWallet(userId: string | undefined) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const load = useCallback(async () => {
    if (!userId) { setWallet(null); return; }
    const { data } = await supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle();
    setWallet((data as Wallet) ?? null);
  }, [userId]);
  useEffect(() => {
    void load();
    const h = () => void load();
    window.addEventListener("wallet-refresh", h);
    return () => window.removeEventListener("wallet-refresh", h);
  }, [load]);
  return { wallet, reload: load };
}
