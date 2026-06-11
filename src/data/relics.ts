export const RELIC_LABELS: Record<string, string> = {
  bio_energy: "生物能",
};

export const RELIC_DESCRIPTIONS: Record<string, string> = {
  bio_energy: "战斗开始时获得 2 点基因物质",
};

/** 雄峰默认遗物 */
export const DRONE_STARTING_RELICS = ["bio_energy"] as const;

export function getCombatStartGeneMaterial(relicIds: string[]): number {
  let total = 0;
  for (const id of relicIds) {
    if (id === "bio_energy") total += 2;
  }
  return total;
}
