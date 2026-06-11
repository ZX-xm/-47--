import type { Difficulty, FactionId } from "../types/game";

export interface MissionTemplate {
  id: string;
  name: string;
  targetFaction: FactionId;
  difficulty: Difficulty;
  description: string;
}

export const MISSIONS: MissionTemplate[] = [
  {
    id: "empire_border_spy_easy",
    name: "帝国边境刺探情报",
    targetFaction: "empire",
    difficulty: "easy",
    description: "潜入帝国边境哨站，收集军事情报",
  },
  {
    id: "empire_border_spy_normal",
    name: "帝国城镇破坏",
    targetFaction: "empire",
    difficulty: "normal",
    description: "潜入帝国城镇，破坏关键设施",
  },
  {
    id: "empire_border_spy_hard",
    name: "攻入帝国机甲工厂",
    targetFaction: "empire",
    difficulty: "hard",
    description: "突破防线，攻入帝国机甲工厂",
  },
  {
    id: "empire_border_spy_impossible",
    name: "进入帝国皇宫",
    targetFaction: "empire",
    difficulty: "impossible",
    description: "深入帝国核心，进入皇宫",
  },
];

export function getMissionsForTarget(targetFaction: FactionId): MissionTemplate[] {
  return MISSIONS.filter((m) => m.targetFaction === targetFaction);
}
