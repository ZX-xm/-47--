import type { TraitId } from "../types/trait";

export const TRAIT_LABELS: Record<TraitId, string> = {
  bio_energy: "生物能",
};

export const TRAIT_DESCRIPTIONS: Record<TraitId, string> = {
  bio_energy: "战斗开始时获得 2 点基因物质",
};

export function getCombatStartGeneMaterialFromTraits(traitIds: string[]): number {
  let total = 0;
  for (const id of traitIds) {
    if (id === "bio_energy") total += 2;
  }
  return total;
}
