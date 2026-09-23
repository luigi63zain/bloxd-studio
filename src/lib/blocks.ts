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
