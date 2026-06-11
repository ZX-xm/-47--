import type { SpecialItemId } from "../types/specialItem";

export const SPECIAL_ITEM_LABELS: Record<SpecialItemId, string> = {
  empire_mech_intel: "帝国机甲情报",
  border_patrol_map: "边境巡逻路线图",
  hive_communicator: "蜂巢联络器",
  mutant_beetle_shell: "变异甲虫壳",
  intel_analyzer: "情报分析仪",
};

export const SPECIAL_ITEM_DESCRIPTIONS: Record<SpecialItemId, string> = {
  empire_mech_intel: "对帝国机甲敌人造成的伤害提高 15%（四舍五入）",
  border_patrol_map: "接下来四场战斗可预览遭遇并选择迎战或躲避",
  hive_communicator:
    "每场战斗开始时可选择一张手牌将其费用变为 0（可跳过）",
  mutant_beetle_shell: "每回合开始时获得 4 点格挡",
  intel_analyzer: "每场战斗第一次造成伤害时，抽一张牌",
};
