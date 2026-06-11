import type { CardInstance } from "./card";
import type { MapNodeType } from "./map";
import type { PendingTargetMode, PupaSnapshot, PupaUnit } from "./pupa";
import type { IntentOverride } from "./pupa";

export type CombatPhase = "player_turn" | "enemy_turn" | "victory" | "defeat";

export interface CombatEnemyUnit {
  unitIndex: number;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  strength: number;
  weak: number;
  vulnerable: number;
  tentacleMarked: boolean;
  stunned: boolean;
  actionIndex: number;
  intentOverride: IntentOverride | null;
  parasiteTurns: number;
  parasiteDamage: number;
  /** 哨戒炮：已攻击次数（满 3 次下回合跳过） */
  attackCount: number;
  skipNextAttack: boolean;
  isBoss: boolean;
  /** BOSS 发呆剩余回合数（战斗开始为 2） */
  bossDazeTurnsRemaining: number;
  /** 两回合发呆未被打醒后的 7+8 重击 */
  bossPostDazeStrikePending: boolean;
  bossHitDuringDaze: boolean;
  bossEmergencyUsed: boolean;
  /** 召唤物：治疗指定索引的友方 */
  summonerIndex: number | null;
  templateId: string | null;
  actions: import("./enemy").EnemyAction[];
}

export interface CombatTurnFlags {
  playerAttacked: boolean;
  playerHit: boolean;
  summonedPupaThisTurn: boolean;
  nextAttackBonus: number;
  energySpentThisTurn: number;
  cardsPlayedThisTurn: number;
}

export interface PendingHiveCommunicator {
  cardInstanceIds: string[];
}

export interface CombatState {
  nodeId: string;
  nodeType: MapNodeType;
  encounterId: string;
  encounterName: string;
  phase: CombatPhase;
  turnNumber: number;
  playerHp: number;
  playerMaxHp: number;
  playerBlock: number;
  playerStrength: number;
  /** 失去力量 debuff 层数，玩家造成伤害时从总值中扣除 */
  playerStrengthLoss: number;
  /** 玩家易伤：受到敌人伤害增加 */
  playerVulnerable: number;
  /** 玩家虚弱：造成攻击伤害减少 */
  playerWeak: number;
  /** 玩家致盲：攻击 30% 落空（每层） */
  playerBlind: number;
  geneMaterial: number;
  playerPowers: string[];
  /** 能力层数（powerId -> 层数） */
  playerPowerStacks: Record<string, number>;
  energy: number;
  maxEnergy: number;
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  hand: CardInstance[];
  enemies: CombatEnemyUnit[];
  pupae: PupaUnit[];
  pendingCardInstanceId: string | null;
  pendingTargetMode: PendingTargetMode;
  pendingPupaId: string | null;
  /** 过载充能等待选择消耗的基因物质 */
  pendingGeneSpend: number | null;
  factionContribution: number;
  combatContributionGain: number;
  explosionSurgeTurns: number;
  regenerationPlanActive: boolean;
  regenerationUsed: boolean;
  lastDeadPupa: PupaSnapshot | null;
  summonCount: number;
  turnFlags: CombatTurnFlags;
  combatLog: string[];
  /** 已安装的联邦义体 */
  installedCybernetics: string[];
  strikeDamageBonus: number;
  defendBlockBonus: number;
  flameHandActive: boolean;
  /** 火焰手：本回合被随机加费的手牌 */
  flameHandPenalizedInstanceId: string | null;
  glideWingActive: boolean;
  secondLifeAvailable: boolean;
  secondLifeUsed: boolean;
  firstDamageDealtThisBattle: boolean;
  pendingHiveCommunicator: PendingHiveCommunicator | null;
  traits: string[];
  specialItems: string[];
  /** 待确认：第二心脏等 */
  pendingSecondHeartCheck: boolean;
  /** 战斗消耗品 */
  consumables: import("./consumable").OwnedConsumable[];
  /** 本回合禁用消耗品（基因过载针） */
  consumablesLockedThisTurn: boolean;
  /** 聚焦芯片：下次攻击 +6 */
  focusChipBonus: number;
  /** 再生血清剩余回合 */
  regenerationSerumTurns: number;
  /** 帝国兴奋剂：回合末扣血 */
  stimulantEndTurnDamage: number;
  /** 战术撤退：下回合加成 */
  nextTurnDrawBonus: number;
  nextTurnEnergyBonus: number;
  /** 电磁烟雾弹：胜利无战利品 */
  skipCombatReward: boolean;
  /** 紧急意识上传已装备 */
  consciousnessUploadActive: boolean;
  /** 复制手牌待选 */
  pendingConsumableCopyCardId: string | null;
  /** 消耗品需选敌 */
  pendingConsumableSlot: number | null;
  /** Run 内永久最大生命增量（商店等） */
  runMaxHpBonus: number;
}

export interface RewardState {
  federationCredits: number;
  factionContribution: number;
  cardChoices: CardInstance[];
  nodeId: string;
}

export interface EnemyIntentInfo {
  unitName: string;
  description: string;
  intentDamage?: number;
}

export const WEAK_DAMAGE_MULT = 0.7;
export const VULNERABLE_DAMAGE_MULT = 1.25;

/** 虚弱：有层数即固定 30% 减伤，层数仅表示持续时间 */
export function applyWeakToOutgoingDamage(damage: number, weakStacks: number): number {
  if (weakStacks <= 0) return damage;
  return Math.floor(damage * WEAK_DAMAGE_MULT);
}

export function applyVulnerableToIncomingDamage(
  damage: number,
  vulnerableStacks: number
): number {
  if (vulnerableStacks <= 0) return damage;
  return Math.floor(damage * Math.pow(VULNERABLE_DAMAGE_MULT, vulnerableStacks));
}

export function calcDamageWithStrength(base: number, strength: number): number {
  return base + strength;
}

export function calcPlayerOutgoingDamage(
  base: number,
  strength: number,
  strengthLoss: number
): number {
  return Math.max(0, base + strength - strengthLoss);
}

export function getVictoryFactionContribution(nodeType: MapNodeType): number {
  switch (nodeType) {
    case "enemy":
      return 5;
    case "elite":
      return 15;
    case "boss":
      return 40;
    default:
      return 0;
  }
}
