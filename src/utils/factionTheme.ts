import type { FactionId } from "../types/game";

/** 已实现赛博 UI 主题的阵营 */
export const THEMED_FACTION_IDS: FactionId[] = [
  "hive",
  "mech",
  "federation",
  "empire",
  "calamity",
  "matrix",
];

export function isThemedFaction(factionId?: string): factionId is FactionId {
  return THEMED_FACTION_IDS.includes(factionId as FactionId);
}

export function getFactionSelectCardClass(factionId: string): string | undefined {
  return isThemedFaction(factionId) ? `select-card--${factionId}` : undefined;
}
