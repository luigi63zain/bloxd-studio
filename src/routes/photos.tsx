import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, FlipHorizontal2, Camera } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import original from "@/assets/bob-original.png.asset.json";
import wave from "@/assets/bob-wave.jpg";
import run from "@/assets/bob-run.jpg";
import jump from "@/assets/bob-jump.jpg";

export const Route = createFileRoute("/photos")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Bob Photo Maker — BloxdStudio" },
    { name: "description", content: "Make a Bloxd Bob photo with standing, waving, running and jumping poses, then save a PNG." },
    { property: "og:title", content: "Bob Photo Maker — BloxdStudio" },
    { property: "og:description", content: "Choose a Bob pose and save your own Bloxd character photo." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PhotoMaker,
});

const POSES = [
  { name: "Standing", src: original.url },
  { name: "Waving", src: wave },
  { name: "Running", src: run },
  { name: "Jumping", src: jump },
] as const;

function PhotoMaker() {
  const [pose, setPose] = useState<(typeof POSES)[number]>(POSES[0]);
  const [flipped, setFlipped] = useState(false);
  const [caption, setCaption] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    setReady(false);
    setError(false);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const styles = getComputedStyle(canvas);
      ctx.fillStyle = styles.getPropertyValue("--photo-paper").trim();
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (flipped) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      const scale = Math.min(704 / image.width, 900 / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(image, (canvas.width - width) / 2, (940 - height) / 2, width, height);
      ctx.restore();
      if (caption.trim()) {
        ctx.fillStyle = styles.getPropertyValue("--photo-ink").trim();
        ctx.font = 'bold 34px "Bricolage Grotesque", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(caption.trim(), canvas.width / 2, 990, 688);
      }
      setReady(true);
    };
    image.onerror = () => { if (active) { setError(true); setReady(false); } };
    image.src = pose.src;
    return () => { active = false; };
  }, [pose, flipped, caption]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    try {
      canvas.toBlob((blob) => {
        if (!blob) { toast.error("Could not save your photo."); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `bloxd-bob-${pose.name.toLowerCase()}.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Bob photo saved");
      }, "image/png");
    } catch { toast.error("Could not save your photo. Please try again."); }
  };

  return (
    <div className="mx-auto min-h-screen max-w-[1200px] px-5 py-6 sm:px-8">
      <SiteHeader />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-bright"><Camera className="size-4" /> BLOXDSTUDIO</div>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Bob Photo Maker</h1>
        </div>
        <Button onClick={download} disabled={!ready}><Download /> Save PNG</Button>
      </div>
      <div className="mt-6 grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative mx-auto w-full max-w-[470px]">
          <canvas ref={canvasRef} width={768} height={1024} aria-label={`${pose.name} Bob photo`} className="photo-canvas block aspect-[3/4] w-full rounded-lg" />
          {!ready && <div role="status" className="absolute inset-0 grid place-items-center bg-background/90 text-sm">{error ? "Bob’s photo could not load. Choose another pose." : "Loading Bob…"}</div>}
          <div className="mt-3 text-center text-xs text-steel">Bob · {pose.name} · 768 × 1024</div>
        </div>
        <aside className="min-w-0 space-y-6">
          <div>
            <h2 className="mb-3 font-display text-lg font-bold">Pose</h2>
            <div className="grid grid-cols-2 gap-3">
              {POSES.map((item) => (
                <Button key={item.name} variant="outline" aria-pressed={pose.name === item.name} onClick={() => setPose(item)} className={`h-auto flex-col overflow-hidden p-2 ${pose.name === item.name ? "ring-2 ring-bright" : ""}`}>
                  <img src={item.src} alt={`${item.name} Bob`} className="photo-thumb aspect-square w-full rounded object-contain" />
                  <span className="py-1 text-xs">{item.name}</span>
                </Button>
              ))}
            </div>
          </div>
          <Button variant="outline" aria-pressed={flipped} onClick={() => setFlipped((value) => !value)} className="w-full"><FlipHorizontal2 /> Flip Bob</Button>
          <div>
            <label htmlFor="photo-caption" className="mb-2 block text-sm">Caption</label>
            <input id="photo-caption" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={40} placeholder="Your caption" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </aside>
      </div>
    </div>
  );
}