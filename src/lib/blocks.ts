export type Category = "event" | "world" | "player" | "logic" | "math";

export type Field = { key: string; kind: "text" | "number"; default: string };

export type BlockDef = {
  type: string;
  category: Category;
  shape: "hat" | "stack" | "c";
  parts: (string | Field)[];
  gen: (v: any, inner: string) => string;
};

const q = (s?: string) => JSON.stringify(s ?? "");
const n = (s?: string) => (s && !isNaN(Number(s)) ? String(Number(s)) : s || "0");

export const BLOCKS: BlockDef[] = [
  { type: "onJoin", category: "event", shape: "hat", parts: ["when player joins"],
    gen: (_v, i) => `onPlayerJoin = (playerId) => {\n${i}}` },
  { type: "onChat", category: "event", shape: "hat", parts: ["when player chats"],
    gen: (_v, i) => `onPlayerChat = (playerId, chatMessage) => {\n${i}}` },
  { type: "tick", category: "event", shape: "hat", parts: ["every game tick"],
    gen: (_v, i) => `tick = () => {\n${i}}` },
  { type: "onClick", category: "event", shape: "hat", parts: ["when code block clicked"],
    gen: (_v, i) => `${i}` },

  { type: "setBlock", category: "world", shape: "stack",
    parts: ["set block", { key: "b", kind: "text", default: "Grass Block" }, "at x", { key: "x", kind: "number", default: "0" }, "y", { key: "y", kind: "number", default: "10" }, "z", { key: "z", kind: "number", default: "0" }],
    gen: (v) => `api.setBlock(${n(v.x)}, ${n(v.y)}, ${n(v.z)}, ${q(v.b)});\n` },
  { type: "broadcast", category: "world", shape: "stack",
    parts: ["broadcast", { key: "m", kind: "text", default: "Welcome to the server!" }],
    gen: (v) => `api.broadcastMessage(${q(v.m)});\n` },

  { type: "say", category: "player", shape: "stack",
    parts: ["send message", { key: "m", kind: "text", default: "Hello!" }],
    gen: (v) => `api.sendMessage(playerId, ${q(v.m)});\n` },
  { type: "tp", category: "player", shape: "stack",
    parts: ["teleport to x", { key: "x", kind: "number", default: "0" }, "y", { key: "y", kind: "number", default: "20" }, "z", { key: "z", kind: "number", default: "0" }],
    gen: (v) => `api.setPosition(playerId, ${n(v.x)}, ${n(v.y)}, ${n(v.z)});\n` },
  { type: "give", category: "player", shape: "stack",
    parts: ["give item", { key: "i", kind: "text", default: "Diamond Sword" }, "amount", { key: "a", kind: "number", default: "1" }],
    gen: (v) => `api.giveItem(playerId, ${q(v.i)}, ${n(v.a)});\n` },
  { type: "health", category: "player", shape: "stack",
    parts: ["set health to", { key: "h", kind: "number", default: "100" }],
    gen: (v) => `api.setHealth(playerId, ${n(v.h)});\n` },

  { type: "repeat", category: "logic", shape: "c",
    parts: ["repeat", { key: "t", kind: "number", default: "10" }, "times"],
    gen: (v, i) => `for (let i = 0; i < ${n(v.t)}; i++) {\n${i}}\n` },
  { type: "ifChat", category: "logic", shape: "c",
    parts: ["if message is", { key: "m", kind: "text", default: "!spawn" }],
    gen: (v, i) => `if (chatMessage === ${q(v.m)}) {\n${i}}\n` },
  { type: "wait", category: "logic", shape: "stack",
    parts: ["log", { key: "m", kind: "text", default: "debug" }],
    gen: (v) => `console.log(${q(v.m)});\n` },

  { type: "setVar", category: "math", shape: "stack",
    parts: ["set", { key: "k", kind: "text", default: "score" }, "to", { key: "v", kind: "number", default: "0" }],
    gen: (v) => `let ${(v.k || "x").replace(/\W/g, "_")} = ${n(v.v)};\n` },
  { type: "changeVar", category: "math", shape: "stack",
    parts: ["change", { key: "k", kind: "text", default: "score" }, "by", { key: "v", kind: "number", default: "1" }],
    gen: (v) => `${(v.k || "x").replace(/\W/g, "_")} += ${n(v.v)};\n` },

  // --- more from the official bloxd.io code API ---
  { type: "onLeave", category: "event", shape: "hat", parts: ["when player leaves"],
    gen: (_v, i) => `onPlayerLeave = (playerId) => {\n${i}}` },
  { type: "onJump", category: "event", shape: "hat", parts: ["when player jumps"],
    gen: (_v, i) => `onPlayerJump = (playerId) => {\n${i}}` },
  { type: "onClickPlayer", category: "event", shape: "hat", parts: ["when player clicks"],
    gen: (_v, i) => `onPlayerClick = (playerId, wasAltClick) => {\n${i}}` },
  { type: "onChangeBlock", category: "event", shape: "hat", parts: ["when player changes a block"],
    gen: (_v, i) => `onPlayerChangeBlock = (playerId, x, y, z, fromBlock, toBlock) => {\n${i}}` },
  { type: "onKill", category: "event", shape: "hat", parts: ["when player kills a player"],
    gen: (_v, i) => `onPlayerKilledOtherPlayer = (playerId, killedPlayer) => {\n${i}}` },
  { type: "onCommand", category: "event", shape: "hat", parts: ["when player uses a /command"],
    gen: (_v, i) => `playerCommand = (playerId, command) => {\n${i}}` },

  { type: "broadcastColor", category: "world", shape: "stack",
    parts: ["broadcast", { key: "m", kind: "text", default: "Game starting!" }, "color", { key: "c", kind: "text", default: "red" }],
    gen: (v) => `api.broadcastMessage(${q(v.m)}, { color: ${q(v.c)} });\n` },
  { type: "spawnMob", category: "world", shape: "stack",
    parts: ["spawn mob", { key: "m", kind: "text", default: "Cow" }, "at x", { key: "x", kind: "number", default: "0" }, "y", { key: "y", kind: "number", default: "10" }, "z", { key: "z", kind: "number", default: "0" }],
    gen: (v) => `api.attemptSpawnMob(${q(v.m)}, ${n(v.x)}, ${n(v.y)}, ${n(v.z)});\n` },
  { type: "blockHere", category: "world", shape: "stack",
    parts: ["place block", { key: "b", kind: "text", default: "Gold Block" }, "under player"],
    gen: (v) => `{ const [px, py, pz] = api.getPosition(playerId); api.setBlock(Math.floor(px), Math.floor(py) - 1, Math.floor(pz), ${q(v.b)}); }\n` },

  { type: "sayColor", category: "player", shape: "stack",
    parts: ["send message", { key: "m", kind: "text", default: "Nice!" }, "color", { key: "c", kind: "text", default: "orange" }],
    gen: (v) => `api.sendMessage(playerId, ${q(v.m)}, { color: ${q(v.c)} });\n` },
  { type: "bigMsg", category: "player", shape: "stack",
    parts: ["show big message", { key: "m", kind: "text", default: "Level up!" }],
    gen: (v) => `api.sendFlyingMiddleMessage(playerId, [${q(v.m)}], 0);\n` },
  { type: "launch", category: "player", shape: "stack",
    parts: ["launch by x", { key: "x", kind: "number", default: "0" }, "y", { key: "y", kind: "number", default: "20" }, "z", { key: "z", kind: "number", default: "0" }],
    gen: (v) => `api.applyImpulse(playerId, ${n(v.x)}, ${n(v.y)}, ${n(v.z)});\n` },
  { type: "velocity", category: "player", shape: "stack",
    parts: ["set speed x", { key: "x", kind: "number", default: "0" }, "y", { key: "y", kind: "number", default: "9" }, "z", { key: "z", kind: "number", default: "0" }],
    gen: (v) => `api.setVelocity(playerId, ${n(v.x)}, ${n(v.y)}, ${n(v.z)});\n` },
  { type: "effect", category: "player", shape: "stack",
    parts: ["give effect", { key: "e", kind: "text", default: "Speed" }, "for ms", { key: "d", kind: "number", default: "5000" }],
    gen: (v) => `api.applyEffect(playerId, ${q(v.e)}, ${n(v.d)}, {});\n` },
  { type: "removeItem", category: "player", shape: "stack",
    parts: ["take item", { key: "i", kind: "text", default: "Dirt" }, "amount", { key: "a", kind: "number", default: "1" }],
    gen: (v) => `api.removeItemName(playerId, ${q(v.i)}, ${n(v.a)});\n` },
  { type: "clearInv", category: "player", shape: "stack", parts: ["clear inventory"],
    gen: () => `api.clearInventory(playerId);\n` },
  { type: "kill", category: "player", shape: "stack", parts: ["kill player"],
    gen: () => `api.killLifeform(playerId);\n` },
  { type: "sound", category: "player", shape: "stack",
    parts: ["play sound", { key: "s", kind: "text", default: "levelUp" }, "volume", { key: "v", kind: "number", default: "1" }],
    gen: (v) => `api.playSound(playerId, ${q(v.s)}, ${n(v.v)}, 1);\n` },
  { type: "pose", category: "player", shape: "stack",
    parts: ["set pose", { key: "p", kind: "text", default: "driving" }],
    gen: (v) => `api.setPlayerPose(playerId, ${q(v.p)});\n` },
  { type: "skin", category: "player", shape: "stack",
    parts: ["change skin", { key: "t", kind: "text", default: "head" }, "to", { key: "s", kind: "text", default: "wizard" }],
    gen: (v) => `api.changePlayerIntoSkin(playerId, ${q(v.t)}, ${q(v.s)});\n` },
  { type: "clientOpt", category: "player", shape: "stack",
    parts: ["set option", { key: "o", kind: "text", default: "speedMultiplier" }, "to", { key: "v", kind: "number", default: "2" }],
    gen: (v) => `api.setClientOption(playerId, ${q(v.o)}, ${n(v.v)});\n` },

  { type: "forAll", category: "logic", shape: "c", parts: ["for every player"],
    gen: (_v, i) => `for (const playerId of api.getPlayerIds()) {\n${i}}\n` },
  { type: "ifCommand", category: "logic", shape: "c",
    parts: ["if command is", { key: "c", kind: "text", default: "spawn" }],
    gen: (v, i) => `if (command === ${q(v.c)}) {\n${i}  return true;\n}\n` },
  { type: "ifPlaced", category: "logic", shape: "c",
    parts: ["if block placed is", { key: "b", kind: "text", default: "TNT" }],
    gen: (v, i) => `if (toBlock === ${q(v.b)}) {\n${i}}\n` },
  { type: "ifHealth", category: "logic", shape: "c",
    parts: ["if health below", { key: "h", kind: "number", default: "20" }],
    gen: (v, i) => `if (api.getHealth(playerId) < ${n(v.h)}) {\n${i}}\n` },
  { type: "chance", category: "logic", shape: "c",
    parts: ["with chance %", { key: "p", kind: "number", default: "50" }],
    gen: (v, i) => `if (Math.random() * 100 < ${n(v.p)}) {\n${i}}\n` },
  { type: "preventChange", category: "logic", shape: "stack", parts: ["cancel block change"],
    gen: () => `return "preventChange";\n` },

  { type: "showVar", category: "math", shape: "stack",
    parts: ["tell player value of", { key: "k", kind: "text", default: "score" }],
    gen: (v) => { const k = (v.k || "x").replace(/\W/g, "_"); return `api.sendMessage(playerId, "${k}: " + ${k});\n`; } },

  // --- extra API functions ---
  { type: "onRespawn", category: "event", shape: "hat", parts: ["when player respawns"],
    gen: (_v, i) => `onRespawnRequest = (playerId) => {\n${i}}` },
  { type: "onDamage", category: "event", shape: "hat", parts: ["when player is hurt"],
    gen: (_v, i) => `onPlayerDamagingOtherPlayer = (attackingPlayer, playerId, damageDealt, withItem) => {\n${i}}` },
  { type: "onDrop", category: "event", shape: "hat", parts: ["when player drops item"],
    gen: (_v, i) => `onPlayerDropItem = (playerId, x, y, z, itemName, itemAmount) => {\n${i}}` },
  { type: "onPickup", category: "event", shape: "hat", parts: ["when player picks up item"],
    gen: (_v, i) => `onPlayerPickedUpItem = (playerId, itemName, itemAmount) => {\n${i}}` },
  { type: "onCrouch", category: "event", shape: "hat", parts: ["when player crouches"],
    gen: (_v, i) => `onPlayerStartChargingItem = (playerId) => {\n${i}}` },

  { type: "fill", category: "world", shape: "stack",
    parts: ["fill", { key: "b", kind: "text", default: "Stone" }, "from x", { key: "x1", kind: "number", default: "0" }, "y", { key: "y1", kind: "number", default: "0" }, "z", { key: "z1", kind: "number", default: "0" }, "to x", { key: "x2", kind: "number", default: "5" }, "y", { key: "y2", kind: "number", default: "5" }, "z", { key: "z2", kind: "number", default: "5" }],
    gen: (v) => `api.setBlockRect([${n(v.x1)}, ${n(v.y1)}, ${n(v.z1)}], [${n(v.x2)}, ${n(v.y2)}, ${n(v.z2)}], ${q(v.b)});\n` },
  { type: "explode", category: "world", shape: "stack",
    parts: ["explosion at x", { key: "x", kind: "number", default: "0" }, "y", { key: "y", kind: "number", default: "10" }, "z", { key: "z", kind: "number", default: "0" }, "power", { key: "p", kind: "number", default: "3" }],
    gen: (v) => `api.createExplosion(${n(v.x)}, ${n(v.y)}, ${n(v.z)}, ${n(v.p)}, ${n(v.p)}, 1, 1, true);\n` },
  { type: "dropItem", category: "world", shape: "stack",
    parts: ["drop item", { key: "i", kind: "text", default: "Apple" }, "amount", { key: "a", kind: "number", default: "1" }, "at player"],
    gen: (v) => `{ const [px, py, pz] = api.getPosition(playerId); api.createItemDrop(px, py, pz, ${q(v.i)}, ${n(v.a)}); }\n` },

  { type: "heal", category: "player", shape: "stack",
    parts: ["heal by", { key: "h", kind: "number", default: "20" }],
    gen: (v) => `api.applyHealthChange(playerId, ${n(v.h)});\n` },
  { type: "shield", category: "player", shape: "stack",
    parts: ["set shield to", { key: "s", kind: "number", default: "50" }],
    gen: (v) => `api.setShieldAmount(playerId, ${n(v.s)});\n` },
  { type: "removeEffect", category: "player", shape: "stack",
    parts: ["remove effect", { key: "e", kind: "text", default: "Speed" }],
    gen: (v) => `api.removeEffect(playerId, ${q(v.e)});\n` },
  { type: "sidebar", category: "player", shape: "stack",
    parts: ["set sidebar text", { key: "m", kind: "text", default: "Coins: 0" }],
    gen: (v) => `api.setClientOption(playerId, "RightInfoText", ${q(v.m)});\n` },
  { type: "nameTag", category: "player", shape: "stack",
    parts: ["set name tag", { key: "m", kind: "text", default: "VIP" }],
    gen: (v) => `api.setTargetedPlayerSettingForEveryone(playerId, "nameTagInfo", { content: [{ str: ${q(v.m)} }] }, true);\n` },
  { type: "spawnPoint", category: "player", shape: "stack",
    parts: ["set spawn to x", { key: "x", kind: "number", default: "0" }, "y", { key: "y", kind: "number", default: "20" }, "z", { key: "z", kind: "number", default: "0" }],
    gen: (v) => `api.setClientOption(playerId, "spawnPoint", [${n(v.x)}, ${n(v.y)}, ${n(v.z)}]);\n` },
  { type: "canFly", category: "player", shape: "stack", parts: ["let player fly"],
    gen: () => `api.setClientOption(playerId, "creative", true);\n` },
  { type: "kick", category: "player", shape: "stack",
    parts: ["kick with reason", { key: "m", kind: "text", default: "Bye!" }],
    gen: (v) => `api.kickPlayer(playerId, ${q(v.m)});\n` },

  { type: "ifHas", category: "logic", shape: "c",
    parts: ["if player has item", { key: "i", kind: "text", default: "Diamond" }],
    gen: (v, i) => `if (api.hasItem(playerId, ${q(v.i)})) {\n${i}}\n` },
  { type: "ifCrouching", category: "logic", shape: "c", parts: ["if player is crouching"],
    gen: (_v, i) => `if (api.isPlayerCrouching(playerId)) {\n${i}}\n` },
  { type: "ifBlockAt", category: "logic", shape: "c",
    parts: ["if block under player is", { key: "b", kind: "text", default: "Gold Block" }],
    gen: (v, i) => `if ((() => { const [px, py, pz] = api.getPosition(playerId); return api.getBlock(Math.floor(px), Math.floor(py) - 1, Math.floor(pz)) === ${q(v.b)}; })()) {\n${i}}\n` },
  { type: "ifVar", category: "logic", shape: "c",
    parts: ["if", { key: "k", kind: "text", default: "score" }, "≥", { key: "v", kind: "number", default: "10" }],
    gen: (v, i) => `if (${(v.k || "x").replace(/\W/g, "_")} >= ${n(v.v)}) {\n${i}}\n` },
  { type: "later", category: "logic", shape: "c",
    parts: ["after ticks", { key: "t", kind: "number", default: "20" }],
    gen: (v, i) => `api.setTimeout?.(() => {\n${i}}, ${n(v.t)} * 50);\n` },

  { type: "randVar", category: "math", shape: "stack",
    parts: ["set", { key: "k", kind: "text", default: "roll" }, "to random 1 to", { key: "v", kind: "number", default: "6" }],
    gen: (v) => `let ${(v.k || "x").replace(/\W/g, "_")} = Math.floor(Math.random() * ${n(v.v)}) + 1;\n` },
  { type: "mulVar", category: "math", shape: "stack",
    parts: ["multiply", { key: "k", kind: "text", default: "score" }, "by", { key: "v", kind: "number", default: "2" }],
    gen: (v) => `${(v.k || "x").replace(/\W/g, "_")} *= ${n(v.v)};\n` },
  { type: "broadcastVar", category: "math", shape: "stack",
    parts: ["broadcast value of", { key: "k", kind: "text", default: "score" }],
    gen: (v) => { const k = (v.k || "x").replace(/\W/g, "_"); return `api.broadcastMessage("${k}: " + ${k});\n`; } },
];

export const DEF = Object.fromEntries(BLOCKS.map((b) => [b.type, b]));
export const CATEGORIES: Category[] = ["event", "world", "player", "logic", "math"];

export type Node = { id: string; type: string; values: Record<string, string>; children?: Node[] | undefined };

export const uid = () => Math.random().toString(36).slice(2, 9);

export function makeNode(type: string): Node {
  const d = DEF[type]!;
  const values: Record<string, string> = {};
  d.parts.forEach((p) => typeof p !== "string" && (values[p.key] = p.default));
  return { id: uid(), type, values, children: d.shape === "stack" ? undefined : [] };
}

const indent = (s: string) => s.split("\n").map((l) => (l ? "  " + l : l)).join("\n");

export function genList(nodes: Node[]): string {
  return nodes.map((nd) => {
    const d = DEF[nd.type];
    if (!d) return "";
    const inner = nd.children ? indent(genList(nd.children)) : "";
    return d.gen(nd.values, inner);
  }).join("");
}

export function generate(scripts: Node[]): string {
  return scripts.map((s) => genList([s]).trimEnd()).join("\n\n") + "\n";
}
