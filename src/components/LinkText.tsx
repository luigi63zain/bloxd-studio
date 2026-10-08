import { useState } from "react";

const URL_RE = /(https?:\/\/[^\s<]+)/g;

function LinkPreview({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  let host = url;
  try { host = new URL(url).hostname; } catch { /* keep raw */ }
  return (
    <span className="my-1 block">
      <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-bright underline">{url}</a>
      <button type="button" onClick={() => setOpen((o) => !o)} className="ml-2 rounded-md bg-bright/15 px-2 py-0.5 text-[11px] font-bold text-bright">
        {open ? "Hide Site" : "Show Site"}
      </button>
      {open && (
        <span className="mt-2 block overflow-hidden rounded-xl ring-1 ring-border">
          <span className="flex items-center gap-2 bg-background/70 px-3 py-1.5 text-[11px] text-steel">
            <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`} alt="" className="size-4" />
            {host}
            <span className="ml-auto">Blank? This site doesn't allow previews — open the link instead.</span>
          </span>
          <iframe src={url} title={host} sandbox="allow-scripts allow-same-origin allow-popups" loading="lazy" className="h-72 w-full bg-white" />
        </span>
      )}
    </span>
  );
}

export function LinkText({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <LinkPreview key={i} url={p} /> : <span key={i}>{p}</span>))}
    </>
  );
}
