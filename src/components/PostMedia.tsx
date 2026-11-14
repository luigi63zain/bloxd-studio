import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
export function PostMedia({ path, kind }: { path: string; kind: string | null }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.storage.from('post-media').createSignedUrl(path, 600);
      if (active) setUrl(data?.signedUrl ?? '');
    };
    void load();
    const timer = setInterval(() => void load(), 540000);
    return () => { active = false; clearInterval(timer); };
  }, [path]);
  if (!url) return <p className="mt-3 text-xs text-steel">Media unavailable</p>;
  return kind === 'video' ? <video className="mt-3 max-h-96 w-full rounded-lg bg-background object-contain" src={url} controls preload="metadata" /> : <img className="mt-3 max-h-96 max-w-full rounded-lg object-contain" src={url} alt="Post attachment" loading="lazy" />;
}
