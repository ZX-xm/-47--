const STATUS_TOOLTIPS: Record<string, string> = {
  block: "格挡：在本回合内优先抵消受到的伤害。",
  strength: "力量：增加造成的攻击伤害。",
  strength_loss: "失力：造成攻击伤害时从力量中扣除对应层数。",
  vulnerable: "易伤：受到的攻击伤害增加 50%（向下取整后 +1）。",
  weak: "虚弱：造成的攻击伤害减少 25%（向下取整后 -1）。",
  blind: "致盲：攻击有 30% 概率落空（每层独立判定）。",
  gene: "基因物质：蜂巢卡牌的特殊资源，部分卡牌需要消耗。",
  energy: "能量：每回合可用于打出卡牌。",
  contribution: "阵营贡献：用于阵营商店与部分事件选项。",
  pupa_shield: "蛹盾：存活蛹的生命与格挡之和，可为玩家承担伤害。",
  tentacle_mark: "触部标记：可被追加打击等卡牌选为目标。",
  stun: "晕眩：该单位下回合无法行动。",
  parasite: "寄生：回合结束时爆发伤害，可能召唤虚弱蛹。",
  power: "能力：整场战斗持续生效的特殊效果。",
  empire_shield: "帝国护盾发生器：每回合开始时获得 4 点格挡。",
  second_life: "第二命：死亡时以 30% 生命复活，生命上限 -40%。",
  regeneration_serum: "再生血清：每回合结束时回复 3 生命。",
  explosion_surge: "爆能强化剂副作用：每回合开始时失去 3 点生命（本场战斗持续）。",
  focus_chip: "聚焦芯片：本回合下一次攻击伤害 +6。",
};

export function getStatusTooltip(key: string): string | undefined {
  return STATUS_TOOLTIPS[key];
}

export function attachStatusTooltip(
  element: HTMLElement,
  key: string,
  label?: string
): void {
  const tip = getStatusTooltip(key);
  if (!tip) return;
  element.classList.add("has-status-tooltip");
  element.setAttribute("data-tooltip", label ? `${label}\n${tip}` : tip);
}
