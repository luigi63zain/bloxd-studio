import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { REACTIONS } from '@/components/Reactions';
import { supabase } from '@/integrations/supabase/client';
export type PostReaction = { id: string; post_id: string; user_id: string; emoji: string };
export function PostReactions({ postId, reactions, me, onChange }: { postId: string; reactions: PostReaction[]; me: string; onChange: () => void }) {
  const toggle = async (emoji: string) => {
    const mine = reactions.find(r => r.emoji === emoji && r.user_id === me);
    const { error } = mine ? await supabase.from('post_reactions').delete().eq('id', mine.id) : await supabase.from('post_reactions').insert({ post_id: postId, user_id: me, emoji });
    if (error) toast.error(error.message); else onChange();
  };
  return <div className="mt-3 flex flex-wrap gap-1">{REACTIONS.map(r => {
    const list = reactions.filter(x => x.emoji === r.id);
    return <Button key={r.id} size="sm" variant="ghost" title={r.label} aria-label={`${r.label} reaction`} aria-pressed={list.some(x => x.user_id === me)} onClick={() => void toggle(r.id)} className={`react-chip ${list.some(x => x.user_id === me) ? 'bg-bright/20 ring-1 ring-bright' : ''}`}><span className={r.anim}>{r.icon}</span><span>{list.length || ''}</span></Button>;
  })}</div>;
}
