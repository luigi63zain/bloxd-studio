import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { UserName } from "@/components/UserName";
import { useAuth } from "@/hooks/use-auth";
import { refreshWallet, useWallet } from "@/hooks/use-wallet";
import { supabase } from "@/integrations/supabase/client";
import { BADGE_ICON, NAME_CLASS, SHOP } from "@/lib/shop";

export const Route = createFileRoute("/shop")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "ULTRACOINS Shop — BloxdStudio" },
      { name: "description", content: "Spend ULTRACOINS on name colours and badges. Earn them by posting and keeping your streak." },
      { property: "og:title", content: "ULTRACOINS Shop — BloxdStudio" },
      { property: "og:description", content: "Name colours and badges for BloxdStudio players." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { user, profile } = useAuth();
  const { wallet } = useWallet(user?.id);
  const [owned, setOwned] = useState<string[]>([]);
  const loadOwned = async () => {
    const { data } = await supabase.from("purchases").select("item");
    setOwned((data ?? []).map((d) => d.item));
  };
  useEffect(() => { if (user) void loadOwned(); }, [user]);

  const buy = async (id: string) => {
    const { error } = await supabase.rpc("buy_item", { _item: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Bought!"); refreshWallet(); void loadOwned();
  };
  const equip = async (kind: string, key: string) => {
    const { error } = await supabase.rpc("equip_item", { _kind: kind, _item: key });
    if (error) { toast.error(error.message); return; }
    refreshWallet();
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1100px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <div className="glass mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
          <div>
            <h1 className="font-display text-3xl font-extrabold">ULTRACOINS Shop</h1>
            <p className="text-sm text-steel">Earn 5 per post (up to 20 a day) and a bonus every day you visit — bigger with a longer streak.</p>
          </div>
          {user && wallet && (
            <div className="text-right">
              <div className="font-display text-3xl font-extrabold text-amber">🪙 {wallet.coins}</div>
              <div className="text-xs text-steel">You look like: <UserName name={profile?.username ?? "you"} color={wallet.name_color} badge={wallet.badge} /></div>
            </div>
          )}
        </div>
        {!user && <p className="mt-4 text-sm text-steel"><Link to="/auth" className="text-bright underline">Sign in</Link> to earn and spend ULTRACOINS.</p>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP.map((it) => {
            const has = owned.includes(it.id);
            const on = it.kind === "color" ? wallet?.name_color === it.key : wallet?.badge === it.key;
            return (
              <div key={it.id} className="glass rounded-2xl p-5">
                <div className="text-2xl">
                  {it.kind === "color" ? <span className={`font-display font-extrabold ${NAME_CLASS[it.key]}`}>{profile?.username ?? "Player"}</span> : BADGE_ICON[it.key]}
                </div>
                <div className="mt-2 font-bold">{it.label}</div>
                <div className="text-xs text-amber">🪙 {it.price}</div>
                {user && (
                  <div className="mt-3">
                    {!has ? (
                      <button onClick={() => buy(it.id)} disabled={(wallet?.coins ?? 0) < it.price} className="btn-voxel rounded-lg px-4 py-2 text-xs disabled:opacity-50">Buy</button>
                    ) : on ? (
                      <button onClick={() => equip(it.kind, "")} className="btn-ghost rounded-lg px-4 py-2 text-xs">Take off</button>
                    ) : (
                      <button onClick={() => equip(it.kind, it.key)} className="btn-ghost rounded-lg px-4 py-2 text-xs">Use it</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
