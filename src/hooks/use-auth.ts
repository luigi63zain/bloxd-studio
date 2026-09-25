import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const load = async (u: User | null) => {
      setUser(u);
      if (!u) return setIsOwner(false);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.id).eq("role", "owner").maybeSingle();
      setIsOwner(!!data);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { void load(s?.user ?? null); });
    supabase.auth.getUser().then(({ data }) => load(data.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, isOwner };
}
