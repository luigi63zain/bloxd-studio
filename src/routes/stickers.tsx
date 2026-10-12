import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { STICKER_COLORS, STICKER_SIZE, StickerArt } from "@/components/StickerArt";

export const Route = createFileRoute("/stickers")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Sticker maker — BloxdStudio" },
      { name: "description", content: "Draw your own pixel-art stickers and use them in BloxdStudio posts." },
      { property: "og:title", content: "Sticker maker — BloxdStudio" },
      { property: "og:description", content: "Make bloxd-style pixel stickers for your posts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stickers,
});

type S = { id: string; name: string; pixels: string[] };
const blank = () => Array<string>(STICKER_SIZE * STICKER_SIZE).fill("");

function Stickers() {
  const { user } = useAuth();
  const [pixels, setPixels] = useState<string[]>(blank);
  const [color, setColor] = useState(STICKER_COLORS[1]);
  const [name, setName] = useState("");
  const [down, setDown] = useState(false);
  const [mine, setMine] = useState<S[]>([]);

  const load = async () => {
    const { data } = await supabase.from("stickers").select("id,name,pixels").order("created_at", { ascending: false });
    setMine((data as unknown as S[]) ?? []);
  };
  useEffect(() => { if (user) void load(); }, [user]);

  const paint = (i: number) => setPixels((p) => { const n = [...p]; n[i] = color; return n; });

  const save = async () => {
    if (!name.trim()) { toast.error("Give your sticker a name"); return; }
    const { error } = await supabase.from("stickers").insert({ name: name.trim().slice(0, 40), pixels });
    if (error) { toast.error("Couldn't save: " + error.message); return; }
    toast.success("Sticker saved! Use it from the 🎨 Sticker button on posts.");
    setName(""); setPixels(blank()); void load();
  };
  const del = async (id: string) => { await supabase.from("stickers").delete().eq("id", id); void load(); };

  return (
    <div className="relative min-h-screen overflow-hidden" onPointerUp={() => setDown(false)}>
      <Glows />
      <div className="relative mx-auto max-w-[1000px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <h1 className="mt-8 font-display text-3xl font-extrabold">Sticker maker</h1>
        <p className="text-sm text-steel">Draw a 16×16 pixel sticker — your bloxd skin, a block, anything.</p>
        {!user ? (
          <p className="glass mt-6 rounded-2xl p-6 text-sm text-steel"><Link to="/auth" className="text-bright underline">Sign in</Link> to make stickers.</p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr]">
            <div className="glass rounded-2xl p-4">
              <div className="grid touch-none select-none rounded-lg bg-background/60 ring-1 ring-border"
                style={{ width: 384, height: 384, gridTemplateColumns: `repeat(${STICKER_SIZE}, 1fr)` }}>
                {pixels.map((c, i) => (
                  <div key={i} onPointerDown={() => { setDown(true); paint(i); }} onPointerEnter={() => down && paint(i)}
                    className="ring-1 ring-inset ring-border/40" style={{ background: c || "transparent" }} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STICKER_COLORS.map((c) => (
                  <button key={c || "erase"} onClick={() => setColor(c)} title={c ? c : "Eraser"}
                    className={`size-7 rounded-md ring-2 ${color === c ? "ring-bright" : "ring-border"}`}
                    style={{ background: c || "transparent" }}>{c ? "" : "⌫"}</button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Sticker name"
                  className="flex-1 rounded-lg bg-background/60 px-3 py-2 text-sm ring-1 ring-border outline-none" />
                <button onClick={() => setPixels(blank())} className="btn-ghost rounded-lg px-3 py-2 text-xs">Clear</button>
                <button onClick={save} className="btn-voxel rounded-lg px-4 py-2 text-xs">Save</button>
              </div>
            </div>
            <div className="glass rounded-2xl p-4">
              <h2 className="font-display text-lg font-extrabold">Your stickers</h2>
              {mine.length === 0 && <p className="mt-2 text-sm text-steel">None yet.</p>}
              <div className="mt-3 flex flex-wrap gap-3">
                {mine.map((s) => (
                  <div key={s.id} className="rounded-xl bg-background/40 p-2 text-center text-[11px] ring-1 ring-border">
                    <StickerArt pixels={s.pixels} size={72} />
                    <div className="mt-1 max-w-[72px] truncate">{s.name}</div>
                    <button onClick={() => del(s.id)} className="text-steel hover:text-coral">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
