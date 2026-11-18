import { createElement, type ReactNode } from "react";
import { EmojiImg } from "@/lib/emojis";
/* Prices must match public.shop_price() in the database. */
export const SHOP = [
  { id: "color:coral", kind: "color", key: "coral", label: "Coral name", price: 50 },
  { id: "color:mint", kind: "color", key: "mint", label: "Mint name", price: 50 },
  { id: "color:sky", kind: "color", key: "sky", label: "Sky name", price: 75 },
  { id: "color:grape", kind: "color", key: "grape", label: "Grape name", price: 100 },
  { id: "color:amber", kind: "color", key: "amber", label: "Gold name", price: 150 },
  { id: "color:rainbow", kind: "color", key: "rainbow", label: "Rainbow name", price: 300 },
  { id: "badge:fire", kind: "badge", key: "fire", label: "Fire badge", price: 100 },
  { id: "badge:diamond", kind: "badge", key: "diamond", label: "Diamond badge", price: 200 },
  { id: "badge:creeper", kind: "badge", key: "creeper", label: "Draugr Knight badge", price: 250 },
  { id: "badge:crown", kind: "badge", key: "crown", label: "Crown badge", price: 400 },
] as const;

export const NAME_CLASS: Record<string, string> = {
  coral: "text-coral", mint: "text-mint", sky: "text-sky", grape: "text-grape", amber: "text-amber", rainbow: "name-rainbow",
};
/* "creeper" key kept for existing purchases; it now shows the Draugr Knight. */
export const BADGE_ICON: Record<string, ReactNode> = { fire: "🔥", diamond: "💎", creeper: createElement(EmojiImg, { code: "draugrknight", size: 16 }), crown: "👑" };

export type Wallet = { user_id: string; coins: number; streak: number; streak_day: string | null; last_seen: string | null; name_color: string; badge: string };

export const isOnline = (w: { last_seen: string | null }) => !!w.last_seen && Date.now() - new Date(w.last_seen).getTime() < 150000;
