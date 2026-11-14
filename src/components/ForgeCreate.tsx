import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { withCodeCredit } from '@/lib/code-credit';
import { generate } from '@/lib/blocks';
import { readSchemFile } from '@/lib/bloxdschem';
import { toFile, schemCode, type Voxels } from '@/lib/schem';
import { MAX_UPLOAD_BYTES } from '@/lib/social-rules';

export function ForgeCreate({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user, profile } = useAuth();
  const [kind, setKind] = useState<'code' | 'schematic' | 'texture'>('code');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    let path: string | null = null;
    setBusy(true);
    try {
      if (!title.trim()) throw new Error('Give your creation a name');
      if (kind !== 'code' && !file) throw new Error('Choose a file');
      if (file && (file.size > MAX_UPLOAD_BYTES || file.size === 0)) throw new Error('Choose a file up to 20 MB');
      let output = code;
      let data: unknown = { code };
      if (kind === 'code' && file) {
        if (!/\.(js|txt|bxs|json)$/i.test(file.name)) throw new Error('Choose a JS, TXT, BXS or JSON code file');
        if (file.size > 200000) throw new Error('Code files must be under 200 KB');
        const text = await file.text();
        if (/\.(bxs|json)$/i.test(file.name)) {
          const project = JSON.parse(text);
          if (!Array.isArray(project.scripts)) throw new Error('This is not a BloxdStudio code project');
          output = generate(project.scripts); data = project;
        } else { output = text; data = { code: text }; }
      } else if (kind === 'schematic' && file) {
        if (!/\.(bloxdschem|json)$/i.test(file.name)) throw new Error('Choose a .bloxdschem file');
        const result = await readSchemFile(file);
        const vox: Voxels = result.vox;
        const size: [number,number,number] = [1,1,1];
        Object.keys(vox).forEach(key => key.split(',').map(Number).forEach((v,i) => { size[i] = Math.max(size[i] ?? 1, v + 1); }));
        data = toFile(title, vox, size); output = schemCode(vox);
      } else if (kind === 'texture' && file) {
        if (!/\.(zip|png)$/i.test(file.name)) throw new Error('Choose a texture pack ZIP or PNG');
        data = { file: file.name }; output = '';
      }
      if (kind === 'code' && !output.trim()) throw new Error('Paste your code or choose a code file');
      if (JSON.stringify(data).length > 450000 || output.length > 199000) throw new Error('Creation is too large to share');
      if (kind !== 'texture') output = withCodeCredit(output);
      if (file && kind !== 'code') {
        if (!user) throw new Error('Sign in to upload files');
        path = `${user.id}/${crypto.randomUUID()}.${file.name.split('.').pop()?.toLowerCase()}`;
        const { error } = await supabase.storage.from('forge-files').upload(path, file);
        if (error) throw error;
      }
      const { error } = await supabase.from('forge_posts').insert({ title: title.trim(), author: profile?.username ?? (author.trim() || 'anonymous'), description: description.trim(), kind, code: output, data: data as Json, file_path: path, file_name: file?.name ?? null });
      if (error) throw error;
      toast.success('Shared to the Forge!'); onCreated(); onClose();
    } catch(error) {
      if (path) await supabase.storage.from('forge-files').remove([path]);
      toast.error((error as { message: string }).message);
    } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="forge-create-title" className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg bg-popover p-6 ring-1 ring-border">
      <div className="flex items-center justify-between"><h2 id="forge-create-title" className="font-display text-2xl font-bold">Create +</h2><Button disabled={busy} variant="ghost" size="icon" aria-label="Close creation" onClick={onClose}><X /></Button></div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Creation type">{(['code','schematic','texture'] as const).map(k => <Button key={k} variant={kind === k ? 'default' : 'outline'} aria-pressed={kind === k} onClick={() => {setKind(k);setFile(null);}}>{k === 'texture' ? 'Texture pack' : k === 'code' ? 'Code' : 'Schematic'}</Button>)}</div>
      <label className="mt-4 block text-sm">Name<input aria-label="Creation name" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-lg bg-card p-3 ring-1 ring-border" /></label>
      {!user && <label className="mt-3 block text-sm">Username<input aria-label="Creation author" maxLength={40} value={author} onChange={e => setAuthor(e.target.value)} className="mt-1 w-full rounded-lg bg-card p-3 ring-1 ring-border" /></label>}
      <label className="mt-3 block text-sm">Description<textarea aria-label="Creation description" maxLength={500} rows={2} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full rounded-lg bg-card p-3 ring-1 ring-border" /></label>
      {kind === 'code' && <label className="mt-3 block text-sm">Code<textarea aria-label="Paste code" rows={6} maxLength={199000} value={code} onChange={e => {setCode(e.target.value);setFile(null);}} className="mt-1 w-full rounded-lg bg-card p-3 font-mono text-xs ring-1 ring-border" /></label>}
      <label className="mt-4 flex flex-col gap-2 text-sm"><span className="flex items-center gap-2"><Upload size={16}/>Upload {kind === 'code' ? 'JS / TXT / BXS / JSON' : kind === 'texture' ? 'ZIP / PNG' : '.bloxdschem / JSON'}</span><input aria-label="Creation file" type="file" accept={kind === 'code' ? '.js,.txt,.bxs,.json' : kind === 'texture' ? '.zip,.png' : '.bloxdschem,.json'} onChange={e => setFile(e.target.files?.[0] ?? null)} className="max-w-full text-xs" /></label>
      {!user && kind !== 'code' && <p className="mt-3 text-sm text-steel"><Link to="/auth" className="text-bright underline">Sign in</Link> to upload files.</p>}
      <div className="mt-5 flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy || (!user && kind !== 'code')} onClick={() => void submit()}>{busy ? 'Sharing…' : 'Share to Forge'}</Button></div>
    </section>
  </div>;
}
