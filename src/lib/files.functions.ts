import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idInput = z.object({ id: z.string().uuid() });

/* Forge creations are public: a signed link is issued only for a file attached to an existing Forge post. */
export const getForgeFileUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: post } = await supabaseAdmin.from("forge_posts").select("file_path").eq("id", data.id).maybeSingle();
    if (!post?.file_path) throw new Error("File not found");
    const { data: signed, error } = await supabaseAdmin.storage.from("forge-files").createSignedUrl(post.file_path, 120);
    if (error || !signed) throw new Error("File unavailable");
    return { url: signed.signedUrl };
  });

/* Home posts are signed-in only: the caller must be able to read the post through RLS. */
export const getPostMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: post } = await context.supabase.from("hub_posts").select("media_path").eq("id", data.id).maybeSingle();
    if (!post?.media_path) throw new Error("Media not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage.from("post-media").createSignedUrl(post.media_path, 600);
    if (error || !signed) throw new Error("Media unavailable");
    return { url: signed.signedUrl };
  });
