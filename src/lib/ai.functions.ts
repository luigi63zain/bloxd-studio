import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PALETTE } from "./schem";

const API = "applyEffect applyHealthChange applyImpulse attemptSpawnMob broadcastMessage changePlayerIntoSkin clearInventory createItemDrop getBlock getHealth getPlayerIds getPosition giveItem hasItem isPlayerCrouching kickPlayer killLifeform playSound removeEffect removeItemName sendFlyingMiddleMessage sendMessage setBlock setBlockRect setClientOption setHealth setPlayerPose setPosition setShieldAmount setVelocity";
const CALLBACKS = "onPlayerJoin onPlayerLeave onPlayerChat onPlayerJump onPlayerClick onPlayerChangeBlock onPlayerDamagingOtherPlayer onPlayerKilledOtherPlayer onPlayerDropItem onPlayerPickedUpItem onRespawnRequest tick";

const CODE_SYSTEM = `You write JavaScript for the bloxd.io game code API.
Rules (breaking any rule makes the code crash in bloxd.io):
- NEVER use // comments. Only /* */ comments.
- Only call these api functions: ${API}. Call them as api.name(...).
- World Code callbacks are plain global functions, e.g. onPlayerJoin = (playerId) => { ... }. Allowed callbacks: ${CALLBACKS}.
- Code block code can use myId for the player who clicked it.
- Block names must be real bloxd.io names, e.g. "Block of Gold", "Block of Diamond", "Block of Iron", "Block of Coal", "Messy Stone", "Maple Wood Planks". Never "Gold Block".
- Keep it simple and safe. No import/require, no async, no fetch.
Reply with ONLY the code, no markdown fences, no explanation outside /* */ comments.`;

const SCHEM_SYSTEM = `You design small voxel builds for bloxd.io.
The grid is 16 wide (x 0-15), 16 tall (y 0-15, y=0 is ground), 16 deep (z 0-15).
Only use these block names exactly: ${PALETTE.map((p) => p.name).join(", ")}.
Reply with ONLY JSON, no markdown: {"name": "short name", "blocks": [[x,y,z,"Block Name"], ...]}.
Use at most 1500 blocks. Make it look good: walls, roofs, windows, details.`;

const input = z.object({ prompt: z.string().trim().min(3).max(500) });

export const generateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }) => {
    const { askAI } = await import("./ai.server");
    let code = (await askAI(CODE_SYSTEM, data.prompt)).trim();
    code = code.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
    code = code.replace(/(^|[^:"'])\/\/(.*)$/gm, (_m, a, b) => `${a}/*${b} */`);
    return { code };
  });

export const generateSchem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }) => {
    const { askAI } = await import("./ai.server");
    const text = await askAI(SCHEM_SYSTEM, data.prompt);
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("The AI didn't make a build. Try describing it differently.");
    const parsed = JSON.parse(m[0]) as { name?: string; blocks?: unknown[] };
    const names = new Set(PALETTE.map((p) => p.name));
    const vox: Record<string, string> = {};
    for (const b of parsed.blocks ?? []) {
      if (!Array.isArray(b)) continue;
      const [x, y, z, n] = b as [number, number, number, string];
      if ([x, y, z].every((v) => Number.isInteger(v) && v >= 0 && v < 16) && names.has(n)) vox[`${x},${y},${z}`] = n;
    }
    return { name: String(parsed.name ?? "AI build").slice(0, 60), vox };
  });
