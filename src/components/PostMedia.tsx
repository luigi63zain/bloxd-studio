import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getPostMediaUrl } from '@/lib/files.functions';
export function PostMedia({ postId, kind }: { postId: string; kind: string | null }) {
  const [url, setUrl] = useState('');
  const fetchUrl = useServerFn(getPostMediaUrl);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const r = await fetchUrl({ data: { id: postId } }); if (active) setUrl(r.url); }
      catch { if (active) setUrl(''); }
    };
    void load();
    const timer = setInterval(() => void load(), 540000);
    return () => { active = false; clearInterval(timer); };
  }, [postId, fetchUrl]);
  if (!url) return <p className="mt-3 text-xs text-steel">Media unavailable</p>;
  return kind === 'video' ? <video className="mt-3 max-h-96 w-full rounded-lg bg-background object-contain" src={url} controls preload="metadata" /> : <img className="mt-3 max-h-96 max-w-full rounded-lg object-contain" src={url} alt="Post attachment" loading="lazy" />;
}
