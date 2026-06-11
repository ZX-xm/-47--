import {
  CARD_TEMPLATES,
  CHARACTER_CARD_POOLS,
  HIVE_FACTION_CARD_POOL,
  INITIAL_DECK_COMPOSITION,
} from "../data/cards";
import { REWARD_EXCLUDED_TEMPLATES } from "../types/card";
import type { CardInstance, CardTemplate } from "../types/card";

let instanceCounter = 0;

function copyTemplateFields(template: CardTemplate): Omit<CardInstance, "instanceId"> {
  return {
    templateId: template.id,
    name: template.name,
    cost: template.cost,
    type: template.type,
    damage: template.damage,
    block: template.block,
    heal: template.heal,
    stun: template.stun,
    exhaust: template.exhaust,
    powerId: template.powerId,
    requiresTarget: template.requiresTarget,
    chooseTargetWhenMulti: template.chooseTargetWhenMulti,
    requiresTentacleMark: template.requiresTentacleMark,
    requiresPupa: template.requiresPupa,
    requiresAnyPupa: template.requiresAnyPupa,
    geneMaterialCost: template.geneMaterialCost,
    geneMaterialOnKill: template.geneMaterialOnKill,
    applyWeak: template.applyWeak,
    applyVulnerable: template.applyVulnerable,
    grantCardToHand: template.grantCardToHand,
    weakOnElite: template.weakOnElite,
    hiveSpecial: template.hiveSpecial,
    drawCount: template.drawCount,
    bonusEnergyIfSummonedPupa: template.bonusEnergyIfSummonedPupa,
    bonusDamageIfHitThisTurn: template.bonusDamageIfHitThisTurn,
    bonusGeneIfHitThisTurn: template.bonusGeneIfHitThisTurn,
    damageAll: template.damageAll,
    geneMaterialPerHit: template.geneMaterialPerHit,
    geneMaterialPerHitMax: template.geneMaterialPerHitMax,
    geneMaterialPerDebuff: template.geneMaterialPerDebuff,
    geneMaterialPerDebuffMax: template.geneMaterialPerDebuffMax,
    nextAttackBonusGrant: template.nextAttackBonusGrant,
    optionalGeneSpendMax: template.optionalGeneSpendMax,
    bonusDamagePerGeneSpent: template.bonusDamagePerGeneSpent,
    parasiteBonusDamage: template.parasiteBonusDamage,
    exhaustRecycleMax: template.exhaustRecycleMax,
    geneMaterialPerRecycled: template.geneMaterialPerRecycled,
    description: template.description,
  };
}

export function resetInstanceCounter(): void {
  instanceCounter = 0;
}

export function createCardFromTemplate(templateId: string): CardInstance {
  const template = CARD_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Unknown card template: ${templateId}`);
  }
  instanceCounter += 1;
  return {
    instanceId: `${templateId}_${instanceCounter}`,
    ...copyTemplateFields(template),
  };
}

export function buildInitialDeck(): CardInstance[] {
  resetInstanceCounter();
  const deck: CardInstance[] = [];
  for (const { templateId, count } of INITIAL_DECK_COMPOSITION) {
    for (let i = 0; i < count; i++) {
      deck.push(createCardFromTemplate(templateId));
    }
  }
  return deck;
}

export function cloneDeck(deck: CardInstance[]): CardInstance[] {
  return deck.map((card) => ({ ...card }));
}

function getRewardPool(characterId: string): string[] {
  const pool =
    CHARACTER_CARD_POOLS[characterId] ??
    CHARACTER_CARD_POOLS.drone ??
    [];
  return pool.filter((id) => !REWARD_EXCLUDED_TEMPLATES.has(id));
}

export function pickRandomRewardCards(
  characterId: string,
  count: number
): CardInstance[] {
  const pool = getRewardPool(characterId);
  if (pool.length === 0) {
    return [];
  }
  const choices: CardInstance[] = [];
  for (let i = 0; i < count; i++) {
    const templateId = pool[Math.floor(Math.random() * pool.length)]!;
    choices.push(createCardFromTemplate(templateId));
  }
  return choices;
}

export function getDeckSummary(deck: CardInstance[]): string {
  const counts = new Map<string, number>();
  for (const card of deck) {
    counts.set(card.name, (counts.get(card.name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => `${name}×${count}`)
    .join("、");
}

export function countCardsInDeck(deck: CardInstance[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of deck) {
    counts.set(card.templateId, (counts.get(card.templateId) ?? 0) + 1);
  }
  return counts;
}

export { HIVE_FACTION_CARD_POOL };
