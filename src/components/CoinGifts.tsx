import { useState } from 'react';
import { toast } from 'sonner';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { refreshWallet } from '@/hooks/use-wallet';
import { giftAmount } from '@/lib/social-rules';
export function CoinGifts() {
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState('');
  return <section className="mt-8 border-y border-border py-6">
    <h2 className="font-display text-xl font-bold">Give ULTRACOINS</h2>
    <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setReceipt('');
      try {
        const count = giftAmount(amount);
        const { error } = await supabase.rpc('gift_coins', { _username: username.trim(), _amount: count });
        if (error) throw error;
        const text = `Gave ${count.toLocaleString()} ULTRACOINS to ${username.trim()}`;
        setReceipt(text); toast.success(text); refreshWallet(); setAmount('');
      } catch (error) { toast.error(error instanceof Error ? error.message : (error as {message: string}).message); }
      finally { setBusy(false); }
    }}>
      <label className="flex flex-col gap-1 text-xs text-steel">Player username<input aria-label="Player username" required value={username} onChange={e => setUsername(e.target.value)} className="rounded-lg bg-card p-2.5 text-sm text-foreground ring-1 ring-border" /></label>
      <label className="flex flex-col gap-1 text-xs text-steel">ULTRACOINS<input aria-label="ULTRACOINS amount" required type="number" min={1} max={1000000} step={1} value={amount} onChange={e => setAmount(e.target.value)} className="w-40 rounded-lg bg-card p-2.5 text-sm text-foreground ring-1 ring-border" /></label>
      <Button disabled={busy} type="submit"><Gift />{busy ? 'Giving…' : 'Give coins'}</Button>
    </form>
    {receipt && <p role="status" className="mt-3 text-sm text-mint">{receipt}</p>}
  </section>;
}
