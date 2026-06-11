import type { ConsumableDef, ConsumableId } from "../types/consumable";

export const CONSUMABLE_DEFS: Record<ConsumableId, ConsumableDef> = {
  gene_material_pack: {
    id: "gene_material_pack",
    name: "基因物质包",
    price: 8,
    rarity: "common",
    description: "使用后获得 5 点基因物质",
  },
  nano_repair_patch: {
    id: "nano_repair_patch",
    name: "纳米修复贴",
    price: 10,
    rarity: "common",
    description: "回复 6 点生命值",
  },
  empire_stimulant: {
    id: "empire_stimulant",
    name: "帝国兴奋剂",
    price: 15,
    rarity: "common",
    description: "获得 2 点力量，持续 1 回合；回合结束时失去 3 生命",
  },
  energy_injector: {
    id: "energy_injector",
    name: "能量注射剂",
    price: 12,
    rarity: "common",
    description: "获得 1 点能量",
  },
  focus_chip: {
    id: "focus_chip",
    name: "聚焦芯片",
    price: 14,
    rarity: "common",
    description: "本回合下一次攻击伤害 +6",
  },
  emergency_shield: {
    id: "emergency_shield",
    name: "紧急护盾发生器",
    price: 15,
    rarity: "common",
    description: "获得 8 点格挡",
  },
  neural_accelerant: {
    id: "neural_accelerant",
    name: "神经加速剂",
    price: 18,
    rarity: "common",
    description: "抽 2 张牌",
  },
  hive_antidote: {
    id: "hive_antidote",
    name: "蜂巢解毒剂",
    price: 10,
    rarity: "common",
    description: "移除所有 debuff",
  },
  em_smoke_bomb: {
    id: "em_smoke_bomb",
    name: "电磁烟雾弹",
    price: 20,
    rarity: "common",
    description:
      "立即结束当前非 Boss 战斗并视为胜利，但无任何战利品（无联邦币、贡献、卡牌）",
  },
  snare_mine: {
    id: "snare_mine",
    name: "诱捕雷",
    price: 25,
    rarity: "common",
    description: "对一名敌人造成 8 点伤害，并施加 1 层虚弱",
  },
  magnetic_grenade: {
    id: "magnetic_grenade",
    name: "高爆磁吸雷",
    price: 25,
    rarity: "common",
    description: "对一名敌人造成 4 点伤害，并施加 2 层易伤",
  },
  regeneration_serum: {
    id: "regeneration_serum",
    name: "再生血清",
    price: 40,
    rarity: "rare",
    description: "战斗中使用：每回合结束时回复 3 生命，持续 5 回合",
  },
  gene_overload_needle: {
    id: "gene_overload_needle",
    name: "基因过载针",
    price: 35,
    rarity: "rare",
    description: "获得 10 点基因物质，但本回合无法使用其他消耗品",
  },
  empire_battlefield_order: {
    id: "empire_battlefield_order",
    name: "帝国战场指令",
    price: 45,
    rarity: "rare",
    description: "抽 3 张牌，获得 1 点能量",
  },
  emergency_consciousness_upload: {
    id: "emergency_consciousness_upload",
    name: "紧急意识上传",
    price: 45,
    rarity: "rare",
    description:
      "若本场战斗生命值归零，则立即回复 20% 生命（不可主动使用，一次性）",
    passive: true,
  },
  time_auction: {
    id: "time_auction",
    name: "时间拍卖",
    price: 55,
    rarity: "rare",
    description: "获得一个额外回合（当前回合结束，立即开始新回合）",
  },
  reinforced_bone_firmware: {
    id: "reinforced_bone_firmware",
    name: "强化骨骼固件",
    price: 38,
    rarity: "rare",
    description: "永久增加 3 点最大生命值（本场立即回复 3 生命，后续战斗上限提升）",
  },
  unreliable_overclock: {
    id: "unreliable_overclock",
    name: "不可靠超频模块",
    price: 35,
    rarity: "rare",
    description:
      "随机获得：回复 15 生命 / 10 格挡 / 2 力量 / 抽 3 牌 / 12 随机伤害 / 无效果",
  },
  memory_copier: {
    id: "memory_copier",
    name: "记忆复制仪",
    price: 42,
    rarity: "rare",
    description: "复制手牌中一张非消耗牌，将 0 费消耗的复制牌加入手牌（本场有效）",
  },
};

export const COMMON_CONSUMABLE_IDS: ConsumableId[] = Object.values(
  CONSUMABLE_DEFS
)
  .filter((d) => d.rarity === "common")
  .map((d) => d.id);

export const RARE_CONSUMABLE_IDS: ConsumableId[] = Object.values(
  CONSUMABLE_DEFS
)
  .filter((d) => d.rarity === "rare" && !d.passive)
  .map((d) => d.id);

export const PASSIVE_CONSUMABLE_IDS: ConsumableId[] = ["emergency_consciousness_upload"];

export function getConsumableDef(id: ConsumableId): ConsumableDef {
  return CONSUMABLE_DEFS[id];
}
