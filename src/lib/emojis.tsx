import draugr from "@/assets/draugr_knight.png.asset.json";

/* Custom emojis usable as :code: in posts, comments and chat. Add new ones here. */
export const CUSTOM_EMOJIS: Record<string, { label: string; url: string }> = {
  draugrknight: { label: "Draugr Knight", url: draugr.url },
};

export function EmojiImg({ code, size = 20 }: { code: string; size?: number }) {
  const e = CUSTOM_EMOJIS[code];
  if (!e) return <>{`:${code}:`}</>;
  return <img src={e.url} alt={`:${code}:`} title={`:${code}:`} width={size} height={size} className="inline-block align-text-bottom [image-rendering:pixelated]" />;
}

const EMOJI_RE = /:([a-z0-9_]+):/g;
export function EmojiText({ text }: { text: string }) {
  const parts = text.split(EMOJI_RE);
  return <>{parts.map((p, i) => (i % 2 === 1 && CUSTOM_EMOJIS[p] ? <EmojiImg key={i} code={p} /> : i % 2 === 1 ? `:${p}:` : p))}</>;
}

export function EmojiPicker({ onPick }: { onPick: (code: string) => void }) {
  return <div className="flex flex-wrap gap-1" role="group" aria-label="Custom emojis">
    {Object.entries(CUSTOM_EMOJIS).map(([code, e]) => (
      <button key={code} type="button" aria-label={`Insert ${e.label} emoji`} title={`:${code}:`} onClick={() => onPick(`:${code}:`)} className="rounded-lg p-1 ring-1 ring-border hover:ring-bright"><EmojiImg code={code} size={28} /></button>
    ))}
  </div>;
}
