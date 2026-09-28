import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Glows, SiteHeader } from "@/components/SiteHeader";
import { ShareButton } from "@/components/ShareDialog";
import { useAuth } from "@/hooks/use-auth";
import { generateCode, generateSchem } from "@/lib/ai.functions";
import { schemCode, toFile, type Voxels } from "@/lib/schem";

export const Route = createFileRoute("/ai")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "AI Generator — BloxdStudio" },
      { name: "description", content: "Describe a bloxd.io script or build and let AI write the code or schematic for you." },
      { property: "og:title", content: "AI Generator — BloxdStudio" },
      { property: "og:description", content: "Generate bloxd.io code and schematics from a simple description." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiPage,
});

function AiPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const genCode = useServerFn(generateCode);
  const genSchem = useServerFn(generateSchem);
  const [mode, setMode] = useState<"code" | "schem">("code");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [schem, setSchem] = useState<{ name: string; vox: Voxels } | null>(null);

  const go = async () => {
    setBusy(true);
    try {
      if (mode === "code") { const r = await genCode({ data: { prompt } }); setCode(r.code); setSchem(null); }
      else { const r = await genSchem({ data: { prompt } }); setSchem(r); setCode(schemCode(r.vox)); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The AI couldn't make that. Try again later.");
    } finally { setBusy(false); }
  };

  const openSchem = () => {
    if (!schem) return;
    localStorage.setItem("bloxdstudio-schem", JSON.stringify(schem));
    nav({ to: "/schematic" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Glows />
      <div className="relative mx-auto max-w-[1000px] px-5 py-6 sm:px-8">
        <SiteHeader />
        <section className="glass mt-8 rounded-2xl p-6">
          <h1 className="font-display text-3xl font-extrabold">AI Generator</h1>
          <p className="mt-1 text-sm text-steel">Describe what you want and the AI makes the code or a 16×16×16 build.</p>
          {!user ? (
            <p className="mt-5 text-sm">Please <Link to="/auth" className="text-bright underline">sign in</Link> to use the AI generator.</p>
          ) : (
            <>
              <div className="mt-5 flex gap-2">
                {(["code", "schem"] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={`${mode === m ? "btn-voxel" : "btn-ghost"} rounded-lg px-4 py-2 text-sm`}>
                    {m === "code" ? "Code" : "Schematic"}
                  </button>
                ))}
              </div>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} maxLength={500}
                placeholder={mode === "code" ? "e.g. give every player a diamond sword when they join" : "e.g. a small stone house with a gold roof"}
                className="mt-3 w-full rounded-xl bg-background/60 p-3 text-sm ring-1 ring-border outline-none" />
              <button disabled={busy || prompt.trim().length < 3} onClick={go} className="btn-voxel mt-3 rounded-xl px-5 py-2.5 text-sm disabled:opacity-50">
                {busy ? "Generating…" : "Generate"}
              </button>
            </>
          )}
        </section>

        {code && (
          <section className="glass mt-6 rounded-2xl p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-auto font-display text-xl font-extrabold">{schem ? `${schem.name} (${Object.keys(schem.vox).length} blocks)` : "Your code"}</h2>
              <button onClick={() => { navigator.clipboard.writeText(code); toast.success("Code copied"); }} className="btn-ghost rounded-lg px-3 py-2 text-xs">Copy code</button>
              {schem && <button onClick={openSchem} className="btn-ghost rounded-lg px-3 py-2 text-xs">Open in Schematics</button>}
              <ShareButton kind={schem ? "schematic" : "code"} defaultTitle={schem?.name ?? prompt.slice(0, 60)}
                data={schem ? toFile(schem.name, schem.vox) : { ai: true }} code={code} />
            </div>
            <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl bg-background/60 p-4 font-mono text-xs">{code}</pre>
          </section>
        )}
      </div>
    </div>
  );
}
