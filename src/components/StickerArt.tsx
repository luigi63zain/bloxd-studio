export const STICKER_SIZE = 16;
/* Pixel colours are user artwork data, not theme colours. */
export const STICKER_COLORS = ["", "#000000", "#ffffff", "#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#6d4c41", "#f8bbd0", "#90a4ae"];

export type StickerData = { name: string; pixels: string[] };

export function StickerArt({ pixels, size = 64 }: { pixels: string[]; size?: number }) {
  return (
    <div className="grid" style={{ width: size, height: size, gridTemplateColumns: `repeat(${STICKER_SIZE}, 1fr)`, imageRendering: "pixelated" }}>
      {Array.from({ length: STICKER_SIZE * STICKER_SIZE }, (_, i) => (
        <div key={i} style={{ background: pixels[i] || "transparent" }} />
      ))}
    </div>
  );
}
