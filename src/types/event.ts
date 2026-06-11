import type { SpecialItemId } from "./specialItem";

export interface EventChoiceDef {
  id: string;
  label: string;
  /** 选项展示用，不显示给玩家 */
  geneCost?: number;
  contributionCost?: number;
}

export interface EventTemplate {
  id: string;
  title: string;
  intro: string;
  choices: EventChoiceDef[];
}

export interface EventResolution {
  narrative: string;
  federationCredits?: number;
  factionContribution?: number;
  geneMaterial?: number;
  hpChange?: number;
  cardTemplateId?: string;
  randomHiveCard?: boolean;
  randomFederationCybernetic?: boolean;
  randomEmpireEventCard?: boolean;
  /** 事件结算后展示用（已获得的卡牌名称） */
  rewardCardNames?: string[];
  specialItemId?: SpecialItemId;
  /** 触发战斗，战斗胜利后再应用 postCombat 奖励 */
  combatEncounterId?: string;
  postCombatCredits?: number;
  postCombatContribution?: number;
  postCombatSpecialItemId?: SpecialItemId;
  consumeGene?: number;
  consumeContribution?: number;
}

export interface EventSession {
  nodeId: string;
  eventId: string;
  /** 已选选项，等待展示结果 */
  pendingResolution: EventResolution | null;
  /** 事件触发的战斗，胜利后回到结果页 */
  pendingCombatEncounterId: string | null;
  postCombatResolution: EventResolution | null;
}
