import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = { username: string; username_changed_at: string | null };

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async (u: User | null) => {
    setUser(u);
    if (!u) { setIsOwner(false); setProfile(null); return; }
    const [{ data: role }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.id).eq("role", "owner").maybeSingle(),
      supabase.from("profiles").select("username, username_changed_at").eq("user_id", u.id).maybeSingle(),
    ]);
    setIsOwner(!!role);
    setProfile(prof ?? null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { void load(s?.user ?? null); });
    supabase.auth.getUser().then(({ data }) => load(data.user));
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await load(data.user);
  }, [load]);

  return { user, isOwner, profile, refresh };
}
