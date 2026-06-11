import type { FactionId } from "../types/game";
import type { MapNodeType } from "../types/map";
import type { EncounterTemplate, EnemyUnitDef } from "../types/enemy";

const MECH_ACTIONS = [
  { type: "damage_player" as const, base: 6 },
  { type: "gain_block" as const, amount: 6 },
];

const DESERTER_ACTIONS = [
  { type: "steal_player_strength" as const, amount: 1 },
  { type: "damage_player" as const, base: 5 },
  { type: "gain_block" as const, amount: 12 },
];

const LOGISTICS_ACTIONS = [
  {
    type: "sequence" as const,
    actions: [
      { type: "heal_all_allies" as const, amount: 4 },
      { type: "damage_player" as const, base: 1 },
    ],
  },
  { type: "gain_strength_random_ally" as const, amount: 1 },
];

const LOGISTICS_SUMMONED_ACTIONS = [
  { type: "heal_summoner" as const, amount: 3 },
];

const BORDER_SCOUT_ACTIONS = [
  {
    type: "sequence" as const,
    actions: [
      { type: "damage_player" as const, base: 3 },
      { type: "apply_player_vulnerable" as const, stacks: 1 },
    ],
  },
  {
    type: "sequence" as const,
    actions: [
      { type: "gain_block" as const, amount: 4 },
      { type: "damage_player" as const, base: 2 },
    ],
  },
];

const SENTRY_ACTIONS = [{ type: "sentry_attack" as const, base: 5 }];

const BORDER_SENTINEL_ACTIONS = [
  {
    type: "sequence" as const,
    actions: [
      { type: "damage_player" as const, base: 6 },
      { type: "gain_block" as const, amount: 4 },
    ],
  },
  {
    type: "sequence" as const,
    actions: [
      { type: "apply_player_vulnerable" as const, stacks: 1 },
      { type: "summon_unit" as const, templateId: "logistics_drone_summoned" },
    ],
  },
  { type: "damage_player" as const, base: 9 },
];

const RECON_MECH_ACTIONS = [
  {
    type: "sequence" as const,
    actions: [
      { type: "damage_player" as const, base: 4 },
      { type: "apply_player_weak" as const, stacks: 1 },
    ],
  },
  { type: "recon_mech_strike" as const, base: 10, bonusIfPlayerWeak: 4 },
];

const BOSS_ELENA_ACTIONS = [
  { type: "damage_player" as const, base: 7 },
  {
    type: "sequence" as const,
    actions: [
      { type: "gain_block" as const, amount: 8 },
      { type: "apply_player_blind" as const, stacks: 1 },
    ],
  },
  { type: "damage_player_multi" as const, base: 5, hits: 2 },
];

export const UNIT_TEMPLATES: Record<string, EnemyUnitDef> = {
  logistics_drone: {
    id: "logistics_drone",
    name: "帝国后勤无人机",
    maxHp: 12,
    actions: LOGISTICS_ACTIONS,
  },
  logistics_drone_summoned: {
    id: "logistics_drone_summoned",
    name: "帝国后勤无人机",
    maxHp: 6,
    actions: LOGISTICS_SUMMONED_ACTIONS,
  },
  border_scout: {
    id: "border_scout",
    name: "边境侦察兵",
    maxHp: 18,
    actions: BORDER_SCOUT_ACTIONS,
  },
  auto_sentry: {
    id: "auto_sentry",
    name: "自动哨戒炮",
    maxHp: 20,
    actions: SENTRY_ACTIONS,
  },
  border_sentinel: {
    id: "border_sentinel",
    name: "帝国边境哨兵",
    maxHp: 38,
    actions: BORDER_SENTINEL_ACTIONS,
  },
  border_sentinel_half: {
    id: "border_sentinel_half",
    name: "帝国边境哨兵",
    maxHp: 19,
    actions: BORDER_SENTINEL_ACTIONS,
  },
  recon_mech: {
    id: "recon_mech",
    name: "帝国侦察机甲",
    maxHp: 45,
    actions: RECON_MECH_ACTIONS,
  },
  mutant_beetle: {
    id: "mutant_beetle",
    name: "变异甲虫",
    maxHp: 15,
    actions: [{ type: "damage_player" as const, base: 4 }],
  },
  boss_elena: {
    id: "boss_elena",
    name: "边境前哨队长 – 艾琳娜·瓦尔德",
    maxHp: 165,
    isBoss: true,
    actions: BOSS_ELENA_ACTIONS,
  },
};

export const ENCOUNTERS: Record<string, EncounterTemplate> = {
  empire_scout: {
    id: "empire_scout",
    name: "帝国斥候",
    factionId: "empire",
    icon: "🗡",
    description: "造成 8 点伤害 → 提升 2 点力量",
    units: [
      {
        name: "帝国斥候",
        maxHp: 46,
        actions: [
          { type: "damage_player", base: 8 },
          { type: "gain_strength", amount: 2 },
        ],
      },
    ],
  },
  empire_auto_mech_x2: {
    id: "empire_auto_mech_x2",
    name: "帝国自主机甲×2",
    factionId: "empire",
    icon: "🤖",
    description: "每个机甲：造成 6 点伤害 → 获得 6 点格挡",
    units: [
      { name: "自主机甲 A", maxHp: 24, actions: MECH_ACTIONS },
      { name: "自主机甲 B", maxHp: 24, actions: MECH_ACTIONS },
    ],
  },
  empire_abandoned_mech: {
    id: "empire_abandoned_mech",
    name: "帝国废弃机甲",
    factionId: "empire",
    icon: "⚙",
    description: "获得 8 点力量 → 造成 4+力量 伤害 → 晕眩一回合",
    units: [
      {
        name: "帝国废弃机甲",
        maxHp: 52,
        actions: [
          { type: "gain_strength", amount: 8 },
          { type: "damage_player", base: 4 },
          { type: "self_stun" },
        ],
      },
    ],
  },
  empire_deserter_x3: {
    id: "empire_deserter_x3",
    name: "帝国流窜犯×3",
    factionId: "empire",
    icon: "🏴",
    description: "每个流窜犯：偷 1 力量并造成 5+力量 伤害 → 获得 12 格挡",
    units: [
      { name: "流窜犯 A", maxHp: 12, actions: DESERTER_ACTIONS },
      { name: "流窜犯 B", maxHp: 12, actions: DESERTER_ACTIONS },
      { name: "流窜犯 C", maxHp: 12, actions: DESERTER_ACTIONS },
    ],
  },
  empire_scout_sentry: {
    id: "empire_scout_sentry",
    name: "边境侦察兵 + 哨戒炮",
    factionId: "empire",
    icon: "🎯",
    description: "侦察兵施加易伤后，哨戒炮进行炮击",
    units: [UNIT_TEMPLATES.border_scout!, UNIT_TEMPLATES.auto_sentry!],
  },
  empire_logistics_sentry: {
    id: "empire_logistics_sentry",
    name: "后勤无人机 + 哨戒炮",
    factionId: "empire",
    icon: "🛸",
    description: "后勤无人机支援，哨戒炮火力覆盖",
    units: [UNIT_TEMPLATES.logistics_drone!, UNIT_TEMPLATES.auto_sentry!],
  },
  empire_elite_sentinel_sentry: {
    id: "empire_elite_sentinel_sentry",
    name: "边境哨兵 + 哨戒炮",
    factionId: "empire",
    icon: "★",
    description: "精英：边境哨兵与哨戒炮协同",
    units: [UNIT_TEMPLATES.border_sentinel!, UNIT_TEMPLATES.auto_sentry!],
  },
  empire_elite_mech_scout: {
    id: "empire_elite_mech_scout",
    name: "侦察机甲 + 边境侦察兵",
    factionId: "empire",
    icon: "★",
    description: "精英：机甲压制与侦察兵骚扰",
    units: [UNIT_TEMPLATES.recon_mech!, UNIT_TEMPLATES.border_scout!],
  },
  empire_elite_sentinel_scouts: {
    id: "empire_elite_sentinel_scouts",
    name: "边境哨兵 + 侦察兵×2",
    factionId: "empire",
    icon: "★",
    description: "精英：哨兵指挥双侦察兵",
    units: [
      UNIT_TEMPLATES.border_sentinel!,
      UNIT_TEMPLATES.border_scout!,
      { ...UNIT_TEMPLATES.border_scout!, name: "边境侦察兵 B" },
    ],
  },
  empire_boss_elena: {
    id: "empire_boss_elena",
    name: "边境前哨队长 – 艾琳娜·瓦尔德",
    factionId: "empire",
    icon: "☠",
    description: "BOSS：发呆与紧急求援，三回合循环攻势",
    units: [UNIT_TEMPLATES.boss_elena!, UNIT_TEMPLATES.auto_sentry!],
  },
  event_deserter_pursuit: {
    id: "event_deserter_pursuit",
    name: "帝国追杀人员",
    factionId: "empire",
    icon: "⚔",
    description: "1 边境哨兵 + 2 边境侦察兵",
    units: [
      UNIT_TEMPLATES.border_sentinel!,
      UNIT_TEMPLATES.border_scout!,
      { ...UNIT_TEMPLATES.border_scout!, name: "边境侦察兵 B" },
    ],
  },
  event_outpost_ambush: {
    id: "event_outpost_ambush",
    name: "伏击哨兵",
    factionId: "empire",
    icon: "⚔",
    description: "1 帝国边境哨兵",
    units: [UNIT_TEMPLATES.border_sentinel!],
  },
  event_interrogation_rescue: {
    id: "event_interrogation_rescue",
    name: "帝国审讯部队",
    factionId: "empire",
    icon: "⚔",
    description: "2 帝国边境哨兵",
    units: [
      UNIT_TEMPLATES.border_sentinel!,
      { ...UNIT_TEMPLATES.border_sentinel!, name: "帝国边境哨兵 B" },
    ],
  },
  event_mutant_beetles: {
    id: "event_mutant_beetles",
    name: "变异甲虫群",
    factionId: "empire",
    icon: "🪲",
    description: "2 只变异甲虫",
    units: [
      UNIT_TEMPLATES.mutant_beetle!,
      { ...UNIT_TEMPLATES.mutant_beetle!, name: "变异甲虫 B" },
    ],
  },
};

const EMPIRE_NORMAL_POOL = [
  "empire_scout",
  "empire_auto_mech_x2",
  "empire_abandoned_mech",
  "empire_deserter_x3",
  "empire_scout_sentry",
  "empire_logistics_sentry",
];

const EMPIRE_ELITE_POOL = [
  "empire_elite_sentinel_sentry",
  "empire_elite_mech_scout",
  "empire_elite_sentinel_scouts",
];

const EMPIRE_BOSS_POOL = ["empire_boss_elena"];

export const FACTION_ENEMY_POOLS: Partial<Record<FactionId, string[]>> = {
  empire: EMPIRE_NORMAL_POOL,
};

export const FACTION_ELITE_POOLS: Partial<Record<FactionId, string[]>> = {
  empire: EMPIRE_ELITE_POOL,
};

export const FACTION_BOSS_POOLS: Partial<Record<FactionId, string[]>> = {
  empire: EMPIRE_BOSS_POOL,
};

export function getEncounterById(id: string): EncounterTemplate | undefined {
  return ENCOUNTERS[id];
}

export function getUnitTemplate(id: string): EnemyUnitDef | undefined {
  return UNIT_TEMPLATES[id];
}

export function isEmpireMechUnit(templateId: string | null, name: string): boolean {
  if (!templateId) {
    return name.includes("机甲") || name.includes("哨戒炮");
  }
  return [
    "auto_sentry",
    "recon_mech",
  ].includes(templateId) || name.includes("机甲") || name.includes("自主机甲") || name.includes("废弃机甲");
}

export function pickRandomEncounter(
  factionId: FactionId,
  nodeType: MapNodeType = "enemy"
): EncounterTemplate | undefined {
  let pool: string[] | undefined;
  if (nodeType === "boss") {
    pool = FACTION_BOSS_POOLS[factionId];
  } else if (nodeType === "elite") {
    pool = FACTION_ELITE_POOLS[factionId];
  } else {
    pool = FACTION_ENEMY_POOLS[factionId];
  }
  if (!pool || pool.length === 0) return undefined;
  const id = pool[Math.floor(Math.random() * pool.length)]!;
  return getEncounterById(id);
}
