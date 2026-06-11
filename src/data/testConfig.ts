import type { Difficulty, FactionId } from "../types/game";

export const TEST_UNLOCKS = {
  factions: ["hive"] as FactionId[],
  characters: { hive: ["drone"] } as Partial<Record<FactionId, string[]>>,
  targetFactions: ["empire"] as FactionId[],
  difficulties: ["easy"] as Difficulty[],
};

export function isFactionUnlocked(factionId: FactionId): boolean {
  return TEST_UNLOCKS.factions.includes(factionId);
}

export function isCharacterUnlocked(factionId: FactionId, characterId: string): boolean {
  const unlocked = TEST_UNLOCKS.characters[factionId];
  return unlocked ? unlocked.includes(characterId) : false;
}

export function isTargetFactionUnlocked(factionId: FactionId): boolean {
  return TEST_UNLOCKS.targetFactions.includes(factionId);
}

export function isDifficultyUnlocked(difficulty: Difficulty): boolean {
  return TEST_UNLOCKS.difficulties.includes(difficulty);
}
