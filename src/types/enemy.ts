import type { FactionId } from "./game";
import { applyWeakToOutgoingDamage } from "./combat";

/** 子效果（用于 sequence 等复合行动） */
export type EnemyEffect =
  | { type: "damage_player"; base: number }
  | { type: "damage_player_multi"; base: number; hits: number }
  | { type: "gain_strength"; amount: number }
  | { type: "gain_block"; amount: number }
  | { type: "steal_player_strength"; amount: number }
  | { type: "self_stun" }
  | { type: "heal_all_allies"; amount: number }
  | { type: "gain_strength_random_ally"; amount: number }
  | { type: "apply_player_vulnerable"; stacks: number }
  | { type: "apply_player_weak"; stacks: number }
  | { type: "apply_player_blind"; stacks: number }
  | { type: "summon_unit"; templateId: string }
  | { type: "heal_summoner"; amount: number };

export type EnemyAction =
  | EnemyEffect
  | { type: "sequence"; actions: EnemyEffect[] }
  | { type: "sentry_attack"; base: number }
  | { type: "recon_mech_strike"; base: number; bonusIfPlayerWeak: number }
  | { type: "boss_emergency_summon" };

export interface EnemyUnitDef {
  id?: string;
  name: string;
  maxHp: number;
  actions: EnemyAction[];
  isBoss?: boolean;
}

export interface EncounterTemplate {
  id: string;
  name: string;
  factionId: FactionId;
  icon: string;
  description: string;
  units: EnemyUnitDef[];
}

export function getAttackDamage(base: number, strength: number): number {
  return base + strength;
}

function describeEffect(effect: EnemyEffect, strength: number): string {
  switch (effect.type) {
    case "damage_player": {
      const dmg = getAttackDamage(effect.base, strength);
      return strength > 0 ? `攻击 ${dmg}` : `攻击 ${dmg}`;
    }
    case "damage_player_multi":
      return `攻击 ${effect.base}×${effect.hits}`;
    case "gain_strength":
      return `+${effect.amount} 力量`;
    case "gain_block":
      return `+${effect.amount} 格挡`;
    case "steal_player_strength":
      return `偷取 ${effect.amount} 力量`;
    case "self_stun":
      return "晕眩自身";
    case "heal_all_allies":
      return `全体回复 ${effect.amount}`;
    case "gain_strength_random_ally":
      return `随机友方 +${effect.amount} 力量`;
    case "apply_player_vulnerable":
      return `施加 ${effect.stacks} 层易伤`;
    case "apply_player_weak":
      return `施加 ${effect.stacks} 层虚弱`;
    case "apply_player_blind":
      return `施加 ${effect.stacks} 层致盲`;
    case "summon_unit":
      return "召唤单位";
    case "heal_summoner":
      return `回复召唤者 ${effect.amount}`;
  }
}

export function describeAction(action: EnemyAction, strength: number): string {
  switch (action.type) {
    case "sequence":
      return action.actions.map((a) => describeEffect(a, strength)).join("，");
    case "sentry_attack":
      return `攻击 ${getAttackDamage(action.base, strength)}`;
    case "recon_mech_strike":
      return `攻击 ${action.base}（虚弱追加 ${action.bonusIfPlayerWeak}）`;
    case "boss_emergency_summon":
      return "紧急求援";
    default:
      return describeEffect(action, strength);
  }
}

export function getActionIntentDamage(
  action: EnemyAction,
  strength: number,
  weakStacks: number,
  playerWeak: number
): number | undefined {
  const applyWeak = (base: number) =>
    applyWeakToOutgoingDamage(base, weakStacks);

  switch (action.type) {
    case "damage_player":
      return applyWeak(getAttackDamage(action.base, strength));
    case "damage_player_multi":
      return applyWeak(getAttackDamage(action.base, strength)) * action.hits;
    case "sequence": {
      let total = 0;
      for (const step of action.actions) {
        const d = getEffectIntentDamage(step, strength, weakStacks, playerWeak);
        if (d !== undefined) total += d;
      }
      return total > 0 ? total : undefined;
    }
    case "sentry_attack":
      return applyWeak(getAttackDamage(action.base, strength));
    case "recon_mech_strike": {
      let dmg = action.base;
      if (playerWeak > 0) dmg += action.bonusIfPlayerWeak;
      return applyWeak(dmg);
    }
    default:
      return undefined;
  }
}

function getEffectIntentDamage(
  effect: EnemyEffect,
  strength: number,
  weakStacks: number,
  playerWeak: number
): number | undefined {
  if (effect.type === "damage_player") {
    return getActionIntentDamage(effect, strength, weakStacks, playerWeak);
  }
  if (effect.type === "damage_player_multi") {
    return getActionIntentDamage(effect, strength, weakStacks, playerWeak);
  }
  return undefined;
}

export function describeActions(actions: EnemyAction[], strength: number): string {
  return actions.map((a) => describeAction(a, strength)).join(" → ");
}

export function isAttackAction(action: EnemyAction): boolean {
  if (action.type === "damage_player" || action.type === "sentry_attack") return true;
  if (action.type === "recon_mech_strike") return true;
  if (action.type === "sequence") {
    return action.actions.some(
      (a) => a.type === "damage_player" || a.type === "damage_player_multi"
    );
  }
  return false;
}
