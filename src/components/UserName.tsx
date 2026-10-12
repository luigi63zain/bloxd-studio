import { BADGE_ICON, NAME_CLASS } from "@/lib/shop";

export function UserName({ name, color, badge, rank }: { name: string; color?: string; badge?: string; rank?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`font-bold ${color ? NAME_CLASS[color] ?? "text-foreground" : "text-foreground"}`}>{name}</span>
      {badge && BADGE_ICON[badge] && <span title={badge}>{BADGE_ICON[badge]}</span>}
      {rank === "owner" && <span className="rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber">★ Owner</span>}
      {rank === "coowner" && <span className="rounded-full bg-sky/20 px-2 py-0.5 text-[10px] font-bold uppercase text-sky">✦ Co-owner</span>}
    </span>
  );
}
