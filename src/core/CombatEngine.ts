import { cloneDeck, createCardFromTemplate } from "./DeckBuilder";
import { CARD_TEMPLATES } from "../data/cards";
import { POWER_STACKABLE } from "../types/card";
import type { CardInstance } from "../types/card";
import type {
  CombatEnemyUnit,
  CombatState,
  EnemyIntentInfo,
} from "../types/combat";
import {
  applyVulnerableToIncomingDamage,
  applyWeakToOutgoingDamage,
  calcDamageWithStrength,
  calcPlayerOutgoingDamage,
} from "../types/combat";
import type { EncounterTemplate, EnemyAction, EnemyEffect } from "../types/enemy";
import { getUnitTemplate, isEmpireMechUnit } from "../data/enemies";
import {
  describeAction,
  getActionIntentDamage,
  getAttackDamage,
} from "../types/enemy";
import type { Character } from "../types/game";
import type { MapNodeType } from "../types/map";
import type { PendingTargetMode, PupaSnapshot, PupaUnit } from "../types/pupa";
import type { OwnedConsumable } from "../types/consumable";
import { CONSUMABLE_DEFS } from "../data/consumables";
import { getCombatStartGeneMaterialFromTraits } from "../data/traits";

const HAND_SIZE = 5;
const EXPLOSION_SURGE_LOSS = 3;
const EXPLOSION_SURGE_TURNS = 99;

let pupaCounter = 0;

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function dealDamage(
  targetBlock: number,
  targetHp: number,
  damage: number
): { block: number; hp: number } {
  let remaining = damage;
  let block = targetBlock;
  let hp = targetHp;

  if (block > 0) {
    const blocked = Math.min(block, remaining);
    block -= blocked;
    remaining -= blocked;
  }

  if (remaining > 0) {
    hp = Math.max(0, hp - remaining);
  }

  return { block, hp };
}

function isEliteContext(nodeType: MapNodeType): boolean {
  return nodeType === "elite" || nodeType === "boss";
}

export class CombatEngine {
  private state: CombatState;

  constructor(
    nodeId: string,
    nodeType: MapNodeType,
    encounter: EncounterTemplate,
    deck: CardInstance[],
    character: Character,
    playerHp: number,
    playerMaxHp: number,
    factionContribution: number,
    traits: string[],
    specialItems: string[],
    consumables: OwnedConsumable[]
  ) {
    pupaCounter = 0;
    const enemies: CombatEnemyUnit[] = encounter.units.map((unit, index) =>
      this.createCombatUnit(unit, index)
    );

    const startGene = getCombatStartGeneMaterialFromTraits(traits);
    const shuffled = shuffle(cloneDeck(deck));
    this.state = {
      nodeId,
      nodeType,
      encounterId: encounter.id,
      encounterName: encounter.name,
      phase: "player_turn",
      turnNumber: 1,
      playerHp,
      playerMaxHp,
      playerBlock: 0,
      playerStrength: 0,
      playerStrengthLoss: 0,
      playerVulnerable: 0,
      playerWeak: 0,
      playerBlind: 0,
      geneMaterial: startGene,
      playerPowers: [],
      playerPowerStacks: {},
      energy: character.energy,
      maxEnergy: character.energy,
      drawPile: shuffled,
      discardPile: [],
      exhaustPile: [],
      hand: [],
      enemies,
      pupae: [],
      pendingCardInstanceId: null,
      pendingTargetMode: null,
      pendingPupaId: null,
      pendingGeneSpend: null,
      factionContribution,
      combatContributionGain: 0,
      explosionSurgeTurns: 0,
      regenerationPlanActive: false,
      regenerationUsed: false,
      lastDeadPupa: null,
      summonCount: 0,
      turnFlags: {
        playerAttacked: false,
        playerHit: false,
        summonedPupaThisTurn: false,
        nextAttackBonus: 0,
        energySpentThisTurn: 0,
        cardsPlayedThisTurn: 0,
      },
      combatLog: [
        `遭遇了 ${encounter.name}！`,
        ...(startGene > 0
          ? [`生物能：获得 ${startGene} 点基因物质`]
          : []),
      ],
      installedCybernetics: [],
      strikeDamageBonus: 0,
      defendBlockBonus: 0,
      flameHandActive: false,
      flameHandPenalizedInstanceId: null,
      glideWingActive: false,
      secondLifeAvailable: false,
      secondLifeUsed: false,
      firstDamageDealtThisBattle: false,
      pendingHiveCommunicator: null,
      traits,
      specialItems,
      pendingSecondHeartCheck: false,
      consumables: consumables.map((c) => ({ ...c })),
      consumablesLockedThisTurn: false,
      focusChipBonus: 0,
      regenerationSerumTurns: 0,
      stimulantEndTurnDamage: 0,
      nextTurnDrawBonus: 0,
      nextTurnEnergyBonus: 0,
      skipCombatReward: false,
      consciousnessUploadActive: consumables.some(
        (c) => c.id === "emergency_consciousness_upload"
      ),
      pendingConsumableCopyCardId: null,
      pendingConsumableSlot: null,
      runMaxHpBonus: playerMaxHp - character.maxHp,
    };
    this.installCyberneticsFromDeck();
    this.startPlayerTurn(false);

    const boss = enemies.find((e) => e.isBoss && e.bossDazeTurnsRemaining > 0);
    if (boss) {
      this.log(`${boss.name} 进入两回合发呆状态`);
    }
  }

  getState(): CombatState {
    return this.state;
  }

  getFactionContribution(): number {
    return this.state.factionContribution;
  }

  getGeneMaterial(): number {
    return this.state.geneMaterial;
  }

  getCombatContributionGain(): number {
    return this.state.combatContributionGain;
  }

  cancelTargeting(): void {
    this.state.pendingCardInstanceId = null;
    this.state.pendingTargetMode = null;
    this.state.pendingPupaId = null;
    this.state.pendingGeneSpend = null;
    this.state.pendingConsumableSlot = null;
    this.state.pendingConsumableCopyCardId = null;
  }

  private createCombatUnit(
    unitDef: import("../types/enemy").EnemyUnitDef,
    unitIndex: number,
    options?: { summonerIndex?: number; maxHpOverride?: number }
  ): CombatEnemyUnit {
    const maxHp = options?.maxHpOverride ?? unitDef.maxHp;
    return {
      unitIndex,
      name: unitDef.name,
      hp: maxHp,
      maxHp,
      block: 0,
      strength: 0,
      weak: 0,
      vulnerable: 0,
      tentacleMarked: false,
      stunned: false,
      actionIndex: 0,
      intentOverride: null,
      parasiteTurns: 0,
      parasiteDamage: 0,
      attackCount: 0,
      skipNextAttack: false,
      isBoss: unitDef.isBoss ?? false,
      bossDazeTurnsRemaining: unitDef.isBoss ? 2 : 0,
      bossPostDazeStrikePending: false,
      bossHitDuringDaze: false,
      bossEmergencyUsed: false,
      summonerIndex: options?.summonerIndex ?? null,
      templateId: unitDef.id ?? null,
      actions: unitDef.actions,
    };
  }

  private addSummonedUnit(templateId: string, summonerIndex: number): void {
    const template = getUnitTemplate(templateId);
    if (!template) return;
    const unitIndex = this.state.enemies.length;
    const unit = this.createCombatUnit(template, unitIndex, { summonerIndex });
    this.state.enemies.push(unit);
    this.log(`${unit.name} 加入战斗`);
  }

  private executeBossEmergencySummon(unit: CombatEnemyUnit): void {
    this.log(`${unit.name} 使用紧急求援！`);
    this.addSummonedUnit("border_sentinel_half", unit.unitIndex);
    this.addSummonedUnit("border_sentinel_half", unit.unitIndex);
  }

  private log(message: string): void {
    this.state.combatLog = [...this.state.combatLog, message];
  }

  getEffectiveCardCost(card: CardInstance): number {
    let cost = card.cost;
    if (
      this.state.flameHandActive &&
      this.state.flameHandPenalizedInstanceId === card.instanceId
    ) {
      cost += 1;
    }
    return Math.max(0, cost);
  }

  private installCyberneticsFromDeck(): void {
    const piles = [
      ...this.state.drawPile,
      ...this.state.discardPile,
      ...this.state.hand,
      ...this.state.exhaustPile,
    ];
    const toInstall = piles.filter(
      (c) => CARD_TEMPLATES[c.templateId]?.autoInstallAtBattleStart
    );
    const installIds = new Set(toInstall.map((c) => c.instanceId));

    this.state.drawPile = this.state.drawPile.filter(
      (c) => !installIds.has(c.instanceId)
    );
    this.state.discardPile = this.state.discardPile.filter(
      (c) => !installIds.has(c.instanceId)
    );
    this.state.hand = this.state.hand.filter(
      (c) => !installIds.has(c.instanceId)
    );
    this.state.exhaustPile = this.state.exhaustPile.filter(
      (c) => !installIds.has(c.instanceId)
    );

    for (const card of toInstall) {
      if (this.state.installedCybernetics.includes(card.templateId)) continue;
      this.state.installedCybernetics.push(card.templateId);
      this.log(`义体安装：${card.name}`);
      switch (card.templateId) {
        case "cyber_blade_claw":
          this.state.strikeDamageBonus += 1;
          break;
        case "cyber_muscle_fiber":
          this.state.defendBlockBonus += 1;
          break;
        case "cyber_flame_hand":
          this.state.flameHandActive = true;
          break;
        case "cyber_glide_wing":
          this.state.glideWingActive = true;
          break;
        case "cyber_second_heart":
          break;
      }
    }
  }

  private applyFlameHandPenalty(): void {
    if (!this.state.flameHandActive || this.state.hand.length === 0) return;
    const pick =
      this.state.hand[Math.floor(Math.random() * this.state.hand.length)]!;
    this.state.flameHandPenalizedInstanceId = pick.instanceId;
    this.log(`火焰手：${pick.name} 费用 +1`);
  }

  resolveHiveCommunicator(cardInstanceId: string | null): CombatState {
    if (!this.state.pendingHiveCommunicator) return this.state;
    if (cardInstanceId) {
      const card = this.state.hand.find((c) => c.instanceId === cardInstanceId);
      if (card) {
        card.cost = 0;
        this.log(`蜂巢联络器：${card.name} 费用变为 0`);
      }
    } else {
      this.log("蜂巢联络器：跳过");
    }
    this.state.pendingHiveCommunicator = null;
    return this.state;
  }

  private livingPupae(): PupaUnit[] {
    return this.state.pupae.filter((p) => p.hp > 0);
  }

  private hasPower(powerId: string): boolean {
    return (this.state.playerPowerStacks[powerId] ?? 0) > 0;
  }

  private getPowerStacks(powerId: string): number {
    return this.state.playerPowerStacks[powerId] ?? 0;
  }

  private grantPower(card: CardInstance): void {
    if (!card.powerId) return;
    const id = card.powerId;
    const current = this.getPowerStacks(id);
    if (current > 0 && !POWER_STACKABLE.has(id)) {
      this.log(`能力「${card.name}」已激活，无法叠加`);
      return;
    }
    this.state.playerPowerStacks[id] = current + 1;
    if (!this.state.playerPowers.includes(id)) {
      this.state.playerPowers.push(id);
    }
    if (id === "regeneration_plan") {
      this.state.regenerationPlanActive = true;
    }
    const stacks = this.state.playerPowerStacks[id]!;
    this.log(
      stacks > 1
        ? `获得能力：${card.name}（${stacks} 层）`
        : `获得能力：${card.name}`
    );
  }

  private summonPupa(weak: boolean): PupaUnit {
    pupaCounter += 1;
    const pupa: PupaUnit = {
      id: `pupa_${pupaCounter}`,
      name: weak ? "虚弱蛹" : "蛹",
      hp: weak ? 4 : 6,
      maxHp: weak ? 4 : 6,
      attack: weak ? 0 : 1,
      strength: 0,
      block: 0,
      turnsRemaining: weak ? 1 : 2,
      weak,
    };
    this.state.pupae.push(pupa);
    this.state.summonCount += 1;
    this.state.turnFlags.summonedPupaThisTurn = true;
    this.log(`召唤 ${pupa.name}（${pupa.hp} 血，${pupa.turnsRemaining} 回合）`);

    if (this.hasPower("self_destruct_order")) {
      this.addCardToHand("order_self_destruct");
    }
    return pupa;
  }

  private snapshotPupa(pupa: PupaUnit): PupaSnapshot {
    return {
      maxHp: pupa.maxHp,
      attack: pupa.attack,
      strength: pupa.strength,
      weak: pupa.weak,
    };
  }

  private onPupaDeath(pupa: PupaUnit): void {
    this.state.lastDeadPupa = this.snapshotPupa(pupa);
    this.state.pupae = this.state.pupae.filter((p) => p.id !== pupa.id);
    this.log(`${pupa.name} 死亡`);

    if (
      this.state.regenerationPlanActive &&
      !this.state.regenerationUsed &&
      this.state.lastDeadPupa
    ) {
      this.state.regenerationUsed = true;
      const snap = this.state.lastDeadPupa;
      pupaCounter += 1;
      const revived: PupaUnit = {
        id: `pupa_${pupaCounter}`,
        name: snap.weak ? "再生虚弱蛹" : "再生蛹",
        hp: Math.max(1, Math.floor(snap.maxHp / 2)),
        maxHp: Math.max(1, Math.floor(snap.maxHp / 2)),
        attack: Math.max(0, Math.floor(snap.attack / 2)),
        strength: Math.floor(snap.strength / 2),
        block: 0,
        turnsRemaining: snap.weak ? 1 : 2,
        weak: snap.weak,
      };
      this.state.pupae.push(revived);
      this.log(`再生计划触发，召唤 ${revived.name}`);
    }
  }

  private sacrificePupaById(pupaId: string): void {
    const pupa = this.state.pupae.find((p) => p.id === pupaId && p.hp > 0);
    if (!pupa) return;
    this.triggerSwarmEcho();
    pupa.hp = 0;
    this.onPupaDeath(pupa);
  }

  private triggerSwarmEcho(): void {
    const stacks = this.getPowerStacks("swarm_echo");
    if (stacks <= 0) return;
    const living = this.state.enemies
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.hp > 0);
    if (living.length === 0) return;
    const pick = living[Math.floor(Math.random() * living.length)]!;
    const damage = 3 * stacks;
    this.damageEnemy(pick.i, damage);
    this.state.playerHp = Math.min(
      this.state.playerMaxHp,
      this.state.playerHp + stacks
    );
    this.log(
      `蜂群回响：随机敌人受到 ${damage} 点伤害，回复 ${stacks} 点生命`
    );
  }

  private gainGeneMaterial(amount: number): void {
    if (amount <= 0) return;
    this.state.geneMaterial += amount;
    this.log(`获得 ${amount} 点基因物质（当前 ${this.state.geneMaterial}）`);
  }

  private spendGeneMaterial(amount: number): void {
    if (amount <= 0) return;
    this.state.geneMaterial = Math.max(0, this.state.geneMaterial - amount);
  }

  private enemyHasDebuff(unit: CombatEnemyUnit): boolean {
    return unit.weak > 0 || unit.vulnerable > 0 || unit.parasiteTurns > 0;
  }

  private livingEnemyCount(): number {
    return this.state.enemies.filter((e) => e.hp > 0).length;
  }

  private needsManualEnemyTarget(card: CardInstance): boolean {
    if (card.requiresTarget) return true;
    if (card.chooseTargetWhenMulti && this.livingEnemyCount() > 1) return true;
    return false;
  }

  private applyDamageToPlayerSide(rawDamage: number, source: string): void {
    let remaining = applyVulnerableToIncomingDamage(
      rawDamage,
      this.state.playerVulnerable
    );
    if (remaining <= 0) return;

    let hitPlayer = false;

    for (const pupa of [...this.livingPupae()]) {
      if (remaining <= 0) break;
      const blockBefore = pupa.block;
      const hpBefore = pupa.hp;
      const result = dealDamage(pupa.block, pupa.hp, remaining);
      pupa.block = result.block;
      pupa.hp = result.hp;
      const absorbed = blockBefore - result.block + (hpBefore - result.hp);
      remaining -= absorbed;
      if (absorbed > 0) {
        this.log(`${source} 对 ${pupa.name} 造成 ${absorbed} 点伤害（蛹护盾）`);
      }
      if (pupa.hp <= 0) {
        this.onPupaDeath(pupa);
      }
    }

    if (remaining > 0) {
      const result = dealDamage(
        this.state.playerBlock,
        this.state.playerHp,
        remaining
      );
      this.state.playerBlock = result.block;
      this.state.playerHp = result.hp;
      this.log(`${source} 对你造成 ${remaining} 点伤害`);
      hitPlayer = true;

      if (this.state.playerHp <= 0) {
        if (!this.trySecondLifeRevive()) {
          this.tryConsciousnessUpload();
        }
      }
    }

    if (hitPlayer && !this.state.turnFlags.playerHit) {
      this.state.turnFlags.playerHit = true;
      if (this.hasPower("counter_awareness")) {
        this.addCardToHand("counter");
      }
    }
  }

  private reshuffleDiscardIntoDraw(): void {
    if (this.state.drawPile.length === 0 && this.state.discardPile.length > 0) {
      this.state.drawPile = shuffle(this.state.discardPile);
      this.state.discardPile = [];
      this.log("弃牌堆洗入抽牌堆");
    }
  }

  private drawCards(count: number): void {
    for (let i = 0; i < count; i++) {
      this.reshuffleDiscardIntoDraw();
      const card = this.state.drawPile.shift();
      if (card) {
        this.state.hand.push(card);
      } else {
        break;
      }
    }
  }

  private discardHand(): void {
    if (this.state.hand.length > 0) {
      this.state.discardPile.push(...this.state.hand);
      this.state.hand = [];
    }
  }

  private addCardToHand(templateId: string, forceExhaust = false): void {
    const card = createCardFromTemplate(templateId);
    if (forceExhaust) {
      card.exhaust = true;
    }
    this.state.hand.push(card);
    this.log(`获得 ${card.name}`);
  }

  private processTurnStartEffects(): void {
    if (this.state.explosionSurgeTurns > 0) {
      this.state.playerHp = Math.max(0, this.state.playerHp - EXPLOSION_SURGE_LOSS);
      this.log(`爆能失控：失去 ${EXPLOSION_SURGE_LOSS} 点生命`);
    }

    if (this.state.specialItems.includes("mutant_beetle_shell")) {
      this.state.playerBlock += 4;
      this.log("变异甲虫壳：获得 4 点格挡");
    }

    const shieldStacks = this.getPowerStacks("empire_shield");
    if (shieldStacks > 0) {
      const block = 4 * shieldStacks;
      this.state.playerBlock += block;
      this.log(
        shieldStacks > 1
          ? `帝国护盾发生器：获得 ${block} 点格挡（${shieldStacks} 层）`
          : `帝国护盾发生器：获得 4 点格挡`
      );
    }

    if (this.state.flameHandActive) {
      const living = this.state.enemies
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.hp > 0);
      if (living.length > 0) {
        const pick = living[Math.floor(Math.random() * living.length)]!;
        this.damageEnemy(pick.i, 6);
        this.log(`火焰手：对 ${pick.e.name} 造成 6 点伤害`);
      }
    }

    for (const pupa of this.livingPupae()) {
      if (pupa.name !== "攻击无人机" || pupa.weak) continue;
      const living = this.state.enemies
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.hp > 0);
      if (living.length > 0) {
        const pick = living[Math.floor(Math.random() * living.length)]!;
        this.damageEnemy(pick.i, 5);
        this.log(`攻击无人机对 ${pick.e.name} 造成 5 点伤害`);
      }
    }

    for (const enemy of this.state.enemies) {
      if (enemy.hp <= 0 || enemy.parasiteTurns !== 1) continue;
      this.damageEnemy(enemy.unitIndex, enemy.parasiteDamage);
      this.log(`${enemy.name} 寄生爆发`);
      enemy.parasiteTurns = 0;
      if (enemy.hp > 0) {
        this.summonPupa(true);
      }
    }

    for (const pupa of this.livingPupae()) {
      if (pupa.weak || pupa.attack <= 0) continue;
      const target = this.state.enemies.findIndex((e) => e.hp > 0);
      if (target >= 0) {
        const dmg = calcDamageWithStrength(pupa.attack, pupa.strength);
        this.damageEnemy(target, dmg);
        this.log(`${pupa.name} 攻击，造成 ${dmg} 点伤害`);
      }
    }
  }

  private tickPupaeLifespan(): void {
    for (const pupa of [...this.livingPupae()]) {
      pupa.turnsRemaining -= 1;
      if (pupa.turnsRemaining <= 0) {
        pupa.hp = 0;
        this.onPupaDeath(pupa);
        this.log(`${pupa.name} 寿命耗尽`);
      }
    }
  }

  private startPlayerTurn(isNewTurn: boolean): void {
    this.state.phase = "player_turn";
    this.state.playerBlock = 0;
    this.state.energy = this.state.maxEnergy;
    this.cancelTargeting();
    this.state.turnFlags = {
      playerAttacked: false,
      playerHit: false,
      summonedPupaThisTurn: false,
      nextAttackBonus: this.state.turnFlags.nextAttackBonus,
      energySpentThisTurn: 0,
      cardsPlayedThisTurn: 0,
    };

    for (const enemy of this.state.enemies) {
      if (enemy.parasiteTurns === 2) {
        enemy.parasiteTurns = 1;
      }
    }

    if (isNewTurn) {
      this.state.turnNumber += 1;
    }

    this.discardHand();
    const drawCount = HAND_SIZE + this.state.nextTurnDrawBonus;
    this.state.nextTurnDrawBonus = 0;
    this.drawCards(drawCount);
    if (this.state.nextTurnEnergyBonus > 0) {
      this.state.energy += this.state.nextTurnEnergyBonus;
      this.log(`战术撤退：额外 ${this.state.nextTurnEnergyBonus} 点能量`);
      this.state.nextTurnEnergyBonus = 0;
    }
    this.state.flameHandPenalizedInstanceId = null;
    this.state.consumablesLockedThisTurn = false;
    this.processTurnStartEffects();
    this.applyFlameHandPenalty();
    if (this.state.enemies.every((e) => e.hp <= 0)) {
      this.checkVictory();
      return;
    }
    this.log(`第 ${this.state.turnNumber} 回合 — 你的回合`);

    if (
      this.state.specialItems.includes("hive_communicator") &&
      this.state.hand.length > 0
    ) {
      this.state.pendingHiveCommunicator = {
        cardInstanceIds: this.state.hand.map((c) => c.instanceId),
      };
      this.log("蜂巢联络器：选择一张手牌费用变为 0，或跳过");
    }
  }

  canPlayCard(card: CardInstance): boolean {
    if (this.state.phase !== "player_turn") return false;
    if (CARD_TEMPLATES[card.templateId]?.unplayable) return false;
    if (this.state.pendingHiveCommunicator) return false;
    if (this.state.energy < this.getEffectiveCardCost(card)) return false;

    if (
      card.geneMaterialCost !== undefined &&
      this.state.geneMaterial < card.geneMaterialCost
    ) {
      return false;
    }

    if (card.requiresTentacleMark) {
      return this.state.enemies.some((e) => e.hp > 0 && e.tentacleMarked);
    }

    if (card.requiresPupa || card.requiresAnyPupa) {
      return this.livingPupae().length > 0;
    }

    return true;
  }

  playCard(
    cardInstanceId: string,
    targetIndex?: number,
    pupaId?: string,
    geneSpend?: number
  ): CombatState {
    if (this.state.phase !== "player_turn") return this.state;

    const cardIndex = this.state.hand.findIndex(
      (c) => c.instanceId === cardInstanceId
    );
    if (cardIndex === -1) return this.state;

    const card = this.state.hand[cardIndex]!;
    if (!this.canPlayCard(card)) return this.state;

    if (card.templateId === "overload_charge") {
      if (geneSpend === undefined) {
        this.state.pendingCardInstanceId = cardInstanceId;
        this.state.pendingTargetMode = "gene_spend";
        return this.state;
      }
      if (targetIndex === undefined) {
        this.state.pendingCardInstanceId = cardInstanceId;
        this.state.pendingGeneSpend = geneSpend;
        this.state.pendingTargetMode = "enemy";
        return this.state;
      }
    }

    if (card.templateId === "order_self_destruct") {
      if (!pupaId && targetIndex === undefined) {
        this.state.pendingCardInstanceId = cardInstanceId;
        this.state.pendingTargetMode = "pupa_then_enemy";
        return this.state;
      }
      if (pupaId && targetIndex === undefined) {
        this.state.pendingCardInstanceId = cardInstanceId;
        this.state.pendingTargetMode = "pupa_then_enemy";
        this.state.pendingPupaId = pupaId;
        return this.state;
      }
      if (pupaId && targetIndex !== undefined) {
        return this.resolveCard(cardIndex, card, targetIndex, pupaId);
      }
    }

    if ((card.requiresPupa || card.requiresAnyPupa) && !pupaId) {
      this.state.pendingCardInstanceId = cardInstanceId;
      this.state.pendingTargetMode = "pupa";
      return this.state;
    }

    if (card.requiresTarget && targetIndex === undefined) {
      this.state.pendingCardInstanceId = cardInstanceId;
      this.state.pendingTargetMode = "enemy";
      return this.state;
    }

    if (this.needsManualEnemyTarget(card) && targetIndex === undefined) {
      this.state.pendingCardInstanceId = cardInstanceId;
      this.state.pendingTargetMode = "enemy";
      return this.state;
    }

    return this.resolveCard(cardIndex, card, targetIndex, pupaId, geneSpend);
  }

  playCardOnTarget(cardInstanceId: string, targetIndex: number): CombatState {
    const pending = this.state.pendingCardInstanceId;
    if (pending === cardInstanceId && this.state.pendingPupaId) {
      return this.playCard(
        cardInstanceId,
        targetIndex,
        this.state.pendingPupaId
      );
    }
    if (pending === cardInstanceId && this.state.pendingGeneSpend !== null) {
      return this.playCard(
        cardInstanceId,
        targetIndex,
        undefined,
        this.state.pendingGeneSpend
      );
    }
    return this.playCard(cardInstanceId, targetIndex);
  }

  playCardOnPupa(cardInstanceId: string, pupaId: string): CombatState {
    return this.playCard(cardInstanceId, undefined, pupaId);
  }

  private resolveCard(
    cardIndex: number,
    card: CardInstance,
    targetIndex?: number,
    pupaId?: string,
    geneSpend?: number
  ): CombatState {
    this.cancelTargeting();
    let energyCost = this.getEffectiveCardCost(card);
    if (
      this.state.glideWingActive &&
      this.state.turnNumber === 2 &&
      this.state.turnFlags.cardsPlayedThisTurn === 1
    ) {
      energyCost = 0;
      this.log("滑翔翼：第二张牌免费");
    }
    this.state.energy -= energyCost;
    this.state.turnFlags.energySpentThisTurn += energyCost;
    this.state.turnFlags.cardsPlayedThisTurn += 1;

    if (card.geneMaterialCost) {
      this.spendGeneMaterial(card.geneMaterialCost);
    }

    if (
      card.templateId === "overload_charge" &&
      geneSpend !== undefined &&
      geneSpend > 0
    ) {
      this.spendGeneMaterial(geneSpend);
    }

    this.state.hand.splice(cardIndex, 1);

    if (card.type === "power" || card.powerId) {
      this.state.exhaustPile.push(card);
    } else if (card.exhaust) {
      this.state.exhaustPile.push(card);
    } else {
      this.state.discardPile.push(card);
    }

    this.log(`使用 ${card.name}`);

    if (card.powerId) {
      this.grantPower(card);
    }

    this.applySpecialCard(card, targetIndex, pupaId, geneSpend);
    this.checkVictory();
    return this.state;
  }

  private applySpecialCard(
    card: CardInstance,
    targetIndex?: number,
    pupaId?: string,
    geneSpend?: number
  ): void {
    switch (card.templateId) {
      case "liquid_fusion":
        if (pupaId) this.sacrificePupaById(pupaId);
        this.state.playerHp = Math.min(this.state.playerMaxHp, this.state.playerHp + 3);
        this.state.playerStrength += 1;
        this.log("回复 3 点生命，获得 1 点力量");
        break;
      case "hypno_ray": {
        const enemy = targetIndex !== undefined ? this.state.enemies[targetIndex] : null;
        if (!enemy || enemy.hp <= 0) break;
        const action = enemy.actions[enemy.actionIndex];
        if (action?.type === "damage_player") {
          enemy.intentOverride = { block: getAttackDamage(action.base, enemy.strength) };
          this.log(`${enemy.name} 意图变为防御 ${enemy.intentOverride.block}`);
        }
        break;
      }
      case "bee_sting_injection":
        if (targetIndex !== undefined) {
          this.damageEnemy(targetIndex, 1, true);
          const enemy = this.state.enemies[targetIndex];
          if (enemy && enemy.hp > 0) {
            enemy.parasiteTurns = 2;
            enemy.parasiteDamage = 4;
            this.log(`${enemy.name} 被施加寄生`);
          }
        }
        break;
      case "infinite_cola":
        this.state.playerHp = Math.min(this.state.playerMaxHp, this.state.playerHp + 1);
        if (targetIndex !== undefined) {
          const before = this.state.enemies[targetIndex]?.hp ?? 0;
          this.damageEnemy(targetIndex, this.calcPlayerAttackDamage(2), true);
          const after = this.state.enemies[targetIndex]?.hp ?? 0;
          if (before > 0 && after <= 0) {
            this.addCardToHand("infinite_cola", true);
          }
        }
        break;
      case "portable_pupa_sac":
        this.summonPupa(true);
        break;
      case "order_self_destruct":
        if (pupaId) this.sacrificePupaById(pupaId);
        if (targetIndex !== undefined) {
          this.damageEnemy(targetIndex, this.calcPlayerAttackDamage(8), true);
        }
        break;
      case "explosion_surge":
        this.state.playerHp = Math.max(0, this.state.playerHp - 1);
        this.state.playerStrength += 4;
        this.state.explosionSurgeTurns = EXPLOSION_SURGE_TURNS;
        break;
      case "cultivate": {
        const pupa = this.state.pupae.find((p) => p.id === pupaId && p.hp > 0);
        if (!pupa) break;
        pupa.maxHp += 2;
        pupa.hp = Math.min(pupa.maxHp, pupa.hp + 2);
        pupa.strength += 1;
        const tgt = this.state.enemies.findIndex((e) => e.hp > 0);
        if (tgt >= 0) {
          this.damageEnemy(tgt, calcDamageWithStrength(pupa.attack, pupa.strength));
        }
        break;
      }
      case "extra_momentum":
        if (pupaId) this.sacrificePupaById(pupaId);
        this.drawCards(2);
        break;
      case "pheromone_lure":
        this.drawCards(card.drawCount ?? 2);
        if (
          card.bonusEnergyIfSummonedPupa &&
          this.state.turnFlags.summonedPupaThisTurn
        ) {
          this.state.energy += card.bonusEnergyIfSummonedPupa;
          this.log("本回合召唤过蛹，获得 1 点能量");
        }
        break;
      case "acid_spit":
        if (targetIndex !== undefined) {
          const enemy = this.state.enemies[targetIndex];
          let damage = this.calcPlayerAttackDamage(card.damage ?? 5);
          if (enemy && enemy.hp > 0 && enemy.parasiteTurns > 0) {
            enemy.parasiteTurns = 0;
            enemy.parasiteDamage = 0;
            damage += card.parasiteBonusDamage ?? 10;
            this.log(`${enemy.name} 的寄生被酸性喷吐移除`);
          }
          this.damageEnemy(targetIndex, damage, true);
        }
        break;
      case "gene_extract":
        if (targetIndex !== undefined) {
          this.damageEnemy(targetIndex, this.calcPlayerAttackDamage(card.damage ?? 4), true);
          const debuffed = this.state.enemies.filter(
            (e) => e.hp > 0 && this.enemyHasDebuff(e)
          ).length;
          const gain = Math.min(
            debuffed * (card.geneMaterialPerDebuff ?? 1),
            card.geneMaterialPerDebuffMax ?? 3
          );
          this.gainGeneMaterial(gain);
        }
        break;
      case "swing_charge":
        if (targetIndex !== undefined) {
          let damage = card.damage ?? 6;
          if (this.state.turnFlags.playerHit) {
            damage += card.bonusDamageIfHitThisTurn ?? 0;
            this.gainGeneMaterial(card.bonusGeneIfHitThisTurn ?? 0);
          }
          this.damageEnemy(targetIndex, this.calcPlayerAttackDamage(damage), true);
        }
        break;
      case "harvest_swarm": {
        const targets = this.state.enemies.filter((e) => e.hp > 0);
        for (const enemy of targets) {
          this.damageEnemy(
            enemy.unitIndex,
            this.calcPlayerAttackDamage(card.damageAll ?? 5),
            true
          );
        }
        const gain = Math.min(
          targets.length * (card.geneMaterialPerHit ?? 1),
          card.geneMaterialPerHitMax ?? 3
        );
        this.gainGeneMaterial(gain);
        break;
      }
      case "compound_eye":
        this.drawCards(card.drawCount ?? 2);
        if (card.nextAttackBonusGrant) {
          this.state.turnFlags.nextAttackBonus += card.nextAttackBonusGrant;
          this.log(`下张攻击牌伤害 +${card.nextAttackBonusGrant}`);
        }
        break;
      case "overload_charge":
        if (targetIndex !== undefined) {
          let damage = card.damage ?? 5;
          const spent = geneSpend ?? 0;
          damage += spent * (card.bonusDamagePerGeneSpent ?? 2);
          this.damageEnemy(targetIndex, this.calcPlayerAttackDamage(damage), true);
          if (spent > 0) {
            this.log(`过载充能消耗 ${spent} 点基因物质`);
          }
        }
        break;
      case "gene_recycle": {
        const maxRecycle = card.exhaustRecycleMax ?? 3;
        const perCard = card.geneMaterialPerRecycled ?? 1;
        const toRecycle = this.state.exhaustPile.splice(0, maxRecycle);
        if (toRecycle.length === 0) {
          this.log("基因回收：消耗堆中没有可洗回的牌");
          break;
        }
        this.state.drawPile = shuffle([...this.state.drawPile, ...toRecycle]);
        const gain = toRecycle.length * perCard;
        this.gainGeneMaterial(gain);
        this.log(`基因回收：${toRecycle.length} 张牌洗入抽牌堆，获得 ${gain} 点基因物质`);
        break;
      }
      case "fragmentation_grenade":
        for (const enemy of this.state.enemies) {
          if (enemy.hp > 0) {
            this.damageEnemy(enemy.unitIndex, 5, true);
          }
        }
        break;
      case "adrenaline":
        this.drawCards(card.drawCount ?? 2);
        break;
      case "execute_order":
        if (targetIndex !== undefined) {
          const enemy = this.state.enemies[targetIndex];
          if (enemy && enemy.hp > 0 && enemy.hp / enemy.maxHp <= 0.3) {
            this.damageEnemy(targetIndex, 15, true);
          } else {
            this.log("处决指令：目标生命高于 30%，未生效");
          }
        }
        break;
      case "empire_mech_pack":
        this.summonEmpireDrone();
        break;
      case "gene_enhancement_needle":
        this.state.playerMaxHp += 2;
        this.state.playerHp = Math.min(
          this.state.playerMaxHp,
          this.state.playerHp + 5
        );
        this.log("基因强化针：最大生命 +2，获得 5 点生命");
        break;
      case "tactical_retreat":
        this.state.nextTurnDrawBonus = 2;
        this.state.nextTurnEnergyBonus = 1;
        this.log("战术撤退：下回合多抽 2 张牌并获得 1 点能量");
        this.endPlayerTurnImmediate();
        break;
      default:
        this.applyGenericCard(card, targetIndex);
        break;
    }
  }

  private calcPlayerAttackDamage(base: number, templateId?: string): number {
    let adjusted = base;
    if (templateId === "strike") {
      adjusted += this.state.strikeDamageBonus;
    }
    let total = calcPlayerOutgoingDamage(
      adjusted,
      this.state.playerStrength,
      this.state.playerStrengthLoss
    );
    total = applyWeakToOutgoingDamage(total, this.state.playerWeak);
    if (this.state.turnFlags.nextAttackBonus > 0) {
      total += this.state.turnFlags.nextAttackBonus;
      this.state.turnFlags.nextAttackBonus = 0;
    }
    if (this.state.focusChipBonus > 0) {
      total += this.state.focusChipBonus;
      this.state.focusChipBonus = 0;
    }
    return total;
  }

  private applyGenericCard(card: CardInstance, targetIndex?: number): void {
    if (card.heal) {
      this.state.playerHp = Math.min(
        this.state.playerMaxHp,
        this.state.playerHp + card.heal
      );
    }

    if (card.block) {
      let block = card.block;
      if (card.templateId === "defend") {
        block += this.state.defendBlockBonus;
      }
      this.state.playerBlock += block;
    }

    let attackTarget = targetIndex;
    if (card.damage !== undefined) {
      if (card.templateId === "execute_order") {
        // handled in applySpecialCard
      } else {
      if (attackTarget === undefined) {
        attackTarget = this.state.enemies.findIndex((e) => e.hp > 0);
      }
      const hits = CARD_TEMPLATES[card.templateId]?.damageHits ?? 1;
      for (let h = 0; h < hits; h++) {
        if (attackTarget < 0) break;
        const unit = this.state.enemies[attackTarget];
        const hpBefore = unit?.hp ?? 0;
        const requiresMark =
          card.requiresTentacleMark && !unit?.tentacleMarked;
        if (!requiresMark && unit) {
          this.damageEnemy(
            attackTarget,
            this.calcPlayerAttackDamage(card.damage, card.templateId),
            true
          );
          if (card.type === "attack" && !this.state.turnFlags.playerAttacked) {
            this.state.turnFlags.playerAttacked = true;
            if (this.hasPower("defense_awareness")) {
              this.addCardToHand("swift_defend");
            }
          }
          if (hpBefore > 0 && unit.hp <= 0 && card.geneMaterialOnKill) {
            this.gainGeneMaterial(card.geneMaterialOnKill);
          }
        }
      }
      }
    }

    if (attackTarget !== undefined && attackTarget >= 0) {
      const unit = this.state.enemies[attackTarget];
      if (unit && unit.hp > 0) {
        if (card.stun) unit.stunned = true;
        if (card.weakOnElite && isEliteContext(this.state.nodeType)) {
          unit.weak += card.weakOnElite;
        }
        if (card.applyVulnerable) unit.vulnerable += card.applyVulnerable;
        if (card.templateId === "tentacle_extend") {
          unit.tentacleMarked = true;
          this.addCardToHand("follow_up_strike");
        }
        if (card.grantCardToHand) this.addCardToHand(card.grantCardToHand);
      }
    }
  }

  private damageEnemy(unitIndex: number, baseDamage: number, fromPlayer = false): void {
    const unit = this.state.enemies[unitIndex];
    if (!unit || unit.hp <= 0) return;

    if (fromPlayer && this.state.playerBlind > 0) {
      if (Math.random() < 0.3) {
        this.log(`致盲：对 ${unit.name} 的攻击落空了`);
        return;
      }
    }

    if (fromPlayer && unit.isBoss && unit.bossDazeTurnsRemaining > 0) {
      unit.bossHitDuringDaze = true;
      unit.bossDazeTurnsRemaining = 0;
      unit.bossPostDazeStrikePending = false;
      if (!unit.bossEmergencyUsed) {
        this.executeBossEmergencySummon(unit);
        unit.bossEmergencyUsed = true;
      }
      this.log(`${unit.name} 被打醒，结束发呆并发动紧急求援！`);
    }

    const damage = applyVulnerableToIncomingDamage(
      this.adjustPlayerDamage(baseDamage, unit, fromPlayer),
      unit.vulnerable
    );
    const result = dealDamage(unit.block, unit.hp, damage);
    unit.block = result.block;
    unit.hp = result.hp;
    this.log(`对 ${unit.name} 造成 ${damage} 点伤害`);

    if (fromPlayer && !this.state.firstDamageDealtThisBattle) {
      this.state.firstDamageDealtThisBattle = true;
      if (this.state.specialItems.includes("intel_analyzer")) {
        this.drawCards(1);
        this.log("情报分析仪：抽一张牌");
      }
    }

    this.checkVictory();
  }

  private adjustPlayerDamage(
    base: number,
    unit: CombatEnemyUnit,
    fromPlayer: boolean
  ): number {
    if (!fromPlayer) return base;
    if (
      this.state.specialItems.includes("empire_mech_intel") &&
      isEmpireMechUnit(unit.templateId, unit.name)
    ) {
      return Math.round(base * 1.15);
    }
    return base;
  }

  private trySecondLifeRevive(): boolean {
    if (!this.state.secondLifeAvailable || this.state.secondLifeUsed) {
      return false;
    }
    this.state.secondLifeUsed = true;
    this.state.secondLifeAvailable = false;
    this.state.playerMaxHp = Math.max(1, Math.floor(this.state.playerMaxHp * 0.6));
    this.state.playerHp = Math.max(
      1,
      Math.floor(this.state.playerMaxHp * 0.3)
    );
    this.log("第二命：以残余生命复活，生命上限降低");
    return true;
  }

  private checkVictory(): void {
    if (this.state.enemies.every((e) => e.hp <= 0)) {
      this.state.phase = "victory";
      this.log(`${this.state.encounterName} 被击败！`);
    }
  }

  private tickPlayerDebuffs(): void {
    if (this.state.playerVulnerable > 0) this.state.playerVulnerable -= 1;
    if (this.state.playerWeak > 0) this.state.playerWeak -= 1;
    if (this.state.playerBlind > 0) this.state.playerBlind -= 1;
  }

  endPlayerTurn(): CombatState {
    if (this.state.phase !== "player_turn") return this.state;

    if (this.state.regenerationSerumTurns > 0) {
      this.state.playerHp = Math.min(
        this.state.playerMaxHp,
        this.state.playerHp + 3
      );
      this.state.regenerationSerumTurns -= 1;
      this.log("再生血清：回复 3 点生命");
    }

    if (this.state.stimulantEndTurnDamage > 0) {
      this.state.playerHp = Math.max(
        0,
        this.state.playerHp - this.state.stimulantEndTurnDamage
      );
      this.state.playerStrength = Math.max(
        0,
        this.state.playerStrength - 2
      );
      this.state.stimulantEndTurnDamage = 0;
      this.log("帝国兴奋剂：回合结束失去 3 生命");
    }

    if (
      this.state.hand.some((c) => c.templateId === "cyber_second_heart") &&
      this.state.turnFlags.energySpentThisTurn === 0 &&
      !this.state.secondLifeUsed
    ) {
      this.state.secondLifeAvailable = true;
      this.log("第二心脏：本回合未消耗能量，获得第二命");
    }

    this.cancelTargeting();
    this.tickPupaeLifespan();
    this.tickPlayerDebuffs();
    this.discardHand();
    this.state.phase = "enemy_turn";
    this.runEnemyTurn();

    if (this.state.playerHp <= 0) {
      this.state.phase = "defeat";
      return this.state;
    }

    this.startPlayerTurn(true);
    return this.state;
  }

  private executeEffect(unit: CombatEnemyUnit, effect: EnemyEffect): void {
    switch (effect.type) {
      case "damage_player": {
        const raw = getAttackDamage(effect.base, unit.strength);
        const damage = applyWeakToOutgoingDamage(raw, unit.weak);
        this.applyDamageToPlayerSide(damage, unit.name);
        break;
      }
      case "damage_player_multi": {
        for (let i = 0; i < effect.hits; i++) {
          const raw = getAttackDamage(effect.base, unit.strength);
          const damage = applyWeakToOutgoingDamage(raw, unit.weak);
          this.applyDamageToPlayerSide(damage, unit.name);
          if (this.state.playerHp <= 0) break;
        }
        break;
      }
      case "gain_strength":
        unit.strength += effect.amount;
        this.log(`${unit.name} 获得 ${effect.amount} 点力量`);
        break;
      case "gain_block":
        unit.block += effect.amount;
        this.log(`${unit.name} 获得 ${effect.amount} 点格挡`);
        break;
      case "steal_player_strength": {
        this.state.playerStrengthLoss += effect.amount;
        const stolen = Math.min(effect.amount, this.state.playerStrength);
        this.state.playerStrength -= stolen;
        unit.strength += stolen;
        this.log(
          `${unit.name} 偷取 ${effect.amount} 点力量（失去力量 ${this.state.playerStrengthLoss}）`
        );
        break;
      }
      case "self_stun":
        unit.stunned = true;
        break;
      case "heal_all_allies": {
        for (const ally of this.state.enemies) {
          if (ally.hp <= 0) continue;
          const before = ally.hp;
          ally.hp = Math.min(ally.maxHp, ally.hp + effect.amount);
          const healed = ally.hp - before;
          if (healed > 0) {
            this.log(`${ally.name} 回复 ${healed} 点生命`);
          }
        }
        break;
      }
      case "gain_strength_random_ally": {
        const allies = this.state.enemies.filter((e) => e.hp > 0);
        if (allies.length === 0) break;
        const pick = allies[Math.floor(Math.random() * allies.length)]!;
        pick.strength += effect.amount;
        this.log(`${pick.name} 获得 ${effect.amount} 点力量`);
        break;
      }
      case "apply_player_vulnerable":
        this.state.playerVulnerable += effect.stacks;
        this.log(`你被施加 ${effect.stacks} 层易伤`);
        break;
      case "apply_player_weak":
        this.state.playerWeak += effect.stacks;
        this.log(`你被施加 ${effect.stacks} 层虚弱`);
        break;
      case "apply_player_blind":
        this.state.playerBlind += effect.stacks;
        this.log(`你被施加 ${effect.stacks} 层致盲`);
        break;
      case "summon_unit":
        this.addSummonedUnit(effect.templateId, unit.unitIndex);
        break;
      case "heal_summoner": {
        if (unit.summonerIndex === null) break;
        const summoner = this.state.enemies[unit.summonerIndex];
        if (!summoner || summoner.hp <= 0) break;
        const before = summoner.hp;
        summoner.hp = Math.min(summoner.maxHp, summoner.hp + effect.amount);
        const healed = summoner.hp - before;
        if (healed > 0) {
          this.log(`${summoner.name} 被 ${unit.name} 回复 ${healed} 点生命`);
        }
        break;
      }
    }
  }

  private executeAction(unit: CombatEnemyUnit, action: EnemyAction): void {
    if (unit.intentOverride) {
      unit.block += unit.intentOverride.block;
      this.log(`${unit.name} 获得 ${unit.intentOverride.block} 点格挡（催眠）`);
      unit.intentOverride = null;
      return;
    }

    switch (action.type) {
      case "sequence":
        for (const step of action.actions) {
          this.executeEffect(unit, step);
          if (this.state.playerHp <= 0) break;
        }
        break;
      case "sentry_attack": {
        if (unit.skipNextAttack) {
          unit.skipNextAttack = false;
          this.log(`${unit.name} 充能中，本回合不攻击`);
          break;
        }
        const raw = getAttackDamage(action.base, unit.strength);
        const damage = applyWeakToOutgoingDamage(raw, unit.weak);
        this.applyDamageToPlayerSide(damage, unit.name);
        unit.attackCount += 1;
        if (unit.attackCount >= 3) {
          unit.attackCount = 0;
          unit.skipNextAttack = true;
          this.log(`${unit.name} 进入充能，下回合不攻击`);
        }
        break;
      }
      case "recon_mech_strike": {
        let base = action.base;
        if (this.state.playerWeak > 0) {
          base += action.bonusIfPlayerWeak;
        }
        const raw = getAttackDamage(base, unit.strength);
        const damage = applyWeakToOutgoingDamage(raw, unit.weak);
        this.applyDamageToPlayerSide(damage, unit.name);
        break;
      }
      case "boss_emergency_summon":
        this.executeBossEmergencySummon(unit);
        break;
      default:
        this.executeEffect(unit, action);
        break;
    }
  }

  private resolveBossTurn(unit: CombatEnemyUnit): boolean {
    if (!unit.isBoss) return false;

    if (unit.bossDazeTurnsRemaining > 0) {
      this.log(`${unit.name} 发呆中…`);
      unit.strength += 4;
      this.log(`${unit.name} 发呆积蓄，获得 4 点力量`);
      unit.bossDazeTurnsRemaining -= 1;
      if (unit.bossDazeTurnsRemaining === 0 && !unit.bossHitDuringDaze) {
        unit.bossPostDazeStrikePending = true;
      }
      return true;
    }

    if (unit.bossPostDazeStrikePending) {
      const raw = getAttackDamage(7, unit.strength);
      const damage = applyWeakToOutgoingDamage(raw, unit.weak);
      this.log(`${unit.name}：重击（7+${unit.strength}）`);
      this.applyDamageToPlayerSide(damage, unit.name);
      unit.bossPostDazeStrikePending = false;
      return true;
    }

    return false;
  }

  private runEnemyTurn(): void {
    for (const unit of this.state.enemies) {
      if (unit.hp <= 0) continue;
      unit.block = 0;
    }

    this.log("敌人回合");

    for (const unit of this.state.enemies) {
      if (unit.hp <= 0) continue;

      if (unit.stunned) {
        unit.stunned = false;
        this.log(`${unit.name} 晕眩中，跳过行动`);
        continue;
      }

      if (!unit.actions.length) continue;

      if (this.resolveBossTurn(unit)) {
        if (this.state.playerHp <= 0) {
          this.state.phase = "defeat";
          return;
        }
        continue;
      }

      const action = unit.actions[unit.actionIndex]!;
      this.log(`${unit.name}：${describeAction(action, unit.strength)}`);
      this.executeAction(unit, action);
      unit.actionIndex = (unit.actionIndex + 1) % unit.actions.length;

      if (this.state.playerHp <= 0) {
        this.state.phase = "defeat";
        return;
      }
    }
  }

  getEnemyIntents(): EnemyIntentInfo[] {
    return this.state.enemies
      .filter((u) => u.hp > 0)
      .map((unit) => {
        if (unit.stunned) {
          return { unitName: unit.name, description: "晕眩" };
        }
        if (unit.intentOverride) {
          return {
            unitName: unit.name,
            description: `防御 ${unit.intentOverride.block}`,
          };
        }
        if (unit.isBoss) {
          if (unit.bossDazeTurnsRemaining > 0) {
            return {
              unitName: unit.name,
              description: `发呆（剩余 ${unit.bossDazeTurnsRemaining} 回合，+4 力量）`,
            };
          }
          if (unit.bossPostDazeStrikePending) {
            const dmg = applyWeakToOutgoingDamage(
              getAttackDamage(7, unit.strength),
              unit.weak
            );
            return {
              unitName: unit.name,
              description: `重击 7+${unit.strength}`,
              intentDamage: dmg,
            };
          }
        }
        if (unit.skipNextAttack && unit.actions[0]?.type === "sentry_attack") {
          return { unitName: unit.name, description: "充能（不攻击）" };
        }
        const action = unit.actions[unit.actionIndex];
        if (!action) {
          return { unitName: unit.name, description: "未知" };
        }
        return {
          unitName: unit.name,
          description: describeAction(action, unit.strength),
          intentDamage: getActionIntentDamage(
            action,
            unit.strength,
            unit.weak,
            this.state.playerWeak
          ),
        };
      });
  }

  private tryConsciousnessUpload(): boolean {
    if (!this.state.consciousnessUploadActive) return false;
    this.state.consciousnessUploadActive = false;
    const idx = this.state.consumables.findIndex(
      (c) => c.id === "emergency_consciousness_upload"
    );
    if (idx >= 0) this.state.consumables.splice(idx, 1);
    this.state.playerHp = Math.max(
      1,
      Math.floor(this.state.playerMaxHp * 0.2)
    );
    this.log("紧急意识上传：回复 20% 生命");
    return true;
  }

  private summonEmpireDrone(): void {
    pupaCounter += 1;
    this.state.pupae.push({
      id: `drone_${pupaCounter}`,
      name: "攻击无人机",
      hp: 20,
      maxHp: 20,
      attack: 0,
      strength: 0,
      block: 0,
      turnsRemaining: 3,
      weak: false,
    });
    this.log("帝国机甲包：攻击无人机加入战斗");
  }

  private removeConsumableAt(slotIndex: number): void {
    if (slotIndex >= 0 && slotIndex < this.state.consumables.length) {
      this.state.consumables.splice(slotIndex, 1);
    }
  }

  private endPlayerTurnImmediate(): void {
    this.endPlayerTurn();
  }

  useConsumable(slotIndex: number, targetIndex?: number): CombatState {
    if (this.state.phase !== "player_turn") return this.state;
    if (this.state.consumablesLockedThisTurn) return this.state;
    if (slotIndex < 0 || slotIndex >= this.state.consumables.length) {
      return this.state;
    }

    const item = this.state.consumables[slotIndex]!;
    const def = CONSUMABLE_DEFS[item.id];
    if (def.passive) return this.state;

    if (
      (item.id === "snare_mine" || item.id === "magnetic_grenade") &&
      targetIndex === undefined
    ) {
      this.state.pendingConsumableSlot = slotIndex;
      this.state.pendingTargetMode = "consumable_enemy";
      return this.state;
    }

    if (item.id === "memory_copier" && !targetIndex) {
      const copyable = this.state.hand.filter(
        (c) => !c.exhaust && !CARD_TEMPLATES[c.templateId]?.unplayable
      );
      if (copyable.length === 0) {
        this.log("记忆复制仪：没有可复制的手牌");
        return this.state;
      }
      this.state.pendingConsumableCopyCardId = "pending";
      this.state.pendingConsumableSlot = slotIndex;
      return this.state;
    }

    this.applyConsumableEffect(item.id, slotIndex, targetIndex);
    return this.state;
  }

  resolveConsumableCopy(cardInstanceId: string): CombatState {
    const slot = this.state.pendingConsumableSlot;
    if (slot === null) return this.state;
    const card = this.state.hand.find((c) => c.instanceId === cardInstanceId);
    if (!card || card.exhaust) return this.state;
    const copy = createCardFromTemplate(card.templateId);
    copy.cost = 0;
    copy.exhaust = true;
    this.state.hand.push(copy);
    this.log(`记忆复制仪：复制 ${card.name}`);
    this.removeConsumableAt(slot);
    this.state.pendingConsumableCopyCardId = null;
    this.state.pendingConsumableSlot = null;
    return this.state;
  }

  useConsumableOnTarget(targetIndex: number): CombatState {
    const slot = this.state.pendingConsumableSlot;
    if (slot === null) return this.state;
    this.state.pendingTargetMode = null;
    this.state.pendingConsumableSlot = null;
    return this.useConsumable(slot, targetIndex);
  }

  private applyConsumableEffect(
    id: OwnedConsumable["id"],
    slotIndex: number,
    targetIndex?: number
  ): void {
    switch (id) {
      case "gene_material_pack":
        this.gainGeneMaterial(5);
        break;
      case "nano_repair_patch":
        this.state.playerHp = Math.min(
          this.state.playerMaxHp,
          this.state.playerHp + 6
        );
        break;
      case "empire_stimulant":
        this.state.playerStrength += 2;
        this.state.stimulantEndTurnDamage = 3;
        break;
      case "energy_injector":
        this.state.energy += 1;
        break;
      case "focus_chip":
        this.state.focusChipBonus += 6;
        break;
      case "emergency_shield":
        this.state.playerBlock += 8;
        break;
      case "neural_accelerant":
        this.drawCards(2);
        break;
      case "hive_antidote":
        this.state.playerVulnerable = 0;
        this.state.playerWeak = 0;
        this.state.playerBlind = 0;
        this.state.playerStrengthLoss = 0;
        break;
      case "em_smoke_bomb":
        if (this.state.nodeType === "boss") {
          this.log("电磁烟雾弹对 BOSS 无效");
          return;
        }
        this.state.skipCombatReward = true;
        for (const e of this.state.enemies) e.hp = 0;
        this.state.phase = "victory";
        this.log("电磁烟雾弹：战斗结束，无战利品");
        this.removeConsumableAt(slotIndex);
        return;
      case "snare_mine":
        if (targetIndex !== undefined) {
          this.damageEnemy(targetIndex, 8, true);
          const e = this.state.enemies[targetIndex];
          if (e && e.hp > 0) e.weak += 1;
        }
        break;
      case "magnetic_grenade":
        if (targetIndex !== undefined) {
          this.damageEnemy(targetIndex, 4, true);
          const e = this.state.enemies[targetIndex];
          if (e && e.hp > 0) e.vulnerable += 2;
        }
        break;
      case "regeneration_serum":
        this.state.regenerationSerumTurns = 5;
        break;
      case "gene_overload_needle":
        this.gainGeneMaterial(10);
        this.state.consumablesLockedThisTurn = true;
        break;
      case "empire_battlefield_order":
        this.drawCards(3);
        this.state.energy += 1;
        break;
      case "time_auction":
        this.grantExtraTurn();
        break;
      case "reinforced_bone_firmware":
        this.state.playerMaxHp += 3;
        this.state.playerHp = Math.min(
          this.state.playerMaxHp,
          this.state.playerHp + 3
        );
        break;
      case "unreliable_overclock":
        this.applyUnreliableOverclock();
        break;
      default:
        break;
    }
    this.log(`使用消耗品：${CONSUMABLE_DEFS[id].name}`);
    this.removeConsumableAt(slotIndex);
    this.checkVictory();
  }

  private applyUnreliableOverclock(): void {
    const effects = [
      () => {
        this.state.playerHp = Math.min(
          this.state.playerMaxHp,
          this.state.playerHp + 15
        );
        this.log("超频：回复 15 生命");
      },
      () => {
        this.state.playerBlock += 10;
        this.log("超频：获得 10 格挡");
      },
      () => {
        this.state.playerStrength += 2;
        this.log("超频：获得 2 点力量");
      },
      () => {
        this.drawCards(3);
        this.log("超频：抽 3 张牌");
      },
      () => {
        const living = this.state.enemies.filter((e) => e.hp > 0);
        if (living.length > 0) {
          const t = living[Math.floor(Math.random() * living.length)]!;
          this.damageEnemy(t.unitIndex, 12, true);
          this.log("超频：造成 12 点随机伤害");
        }
      },
      () => {
        this.log("超频：系统崩溃，无效果");
      },
    ];
    effects[Math.floor(Math.random() * effects.length)]!();
  }

  private grantExtraTurn(): void {
    this.cancelTargeting();
    this.tickPlayerDebuffs();
    this.discardHand();
    this.startPlayerTurn(false);
    this.log("时间拍卖：获得额外回合");
  }

  getValidEnemyTargets(): number[] {
    if (this.state.pendingConsumableSlot !== null) {
      return this.state.enemies
        .filter((e) => e.hp > 0)
        .map((e) => e.unitIndex);
    }

    const pendingId = this.state.pendingCardInstanceId;
    if (!pendingId) return [];

    const mode = this.state.pendingTargetMode;
    if (mode === "pupa") return [];
    if (mode === "pupa_then_enemy" && !this.state.pendingPupaId) return [];

    const card = this.state.hand.find((c) => c.instanceId === pendingId);
    if (!card) return [];

    return this.state.enemies
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => {
        if (e.hp <= 0) return false;
        if (card.requiresTentacleMark && !e.tentacleMarked) return false;
        return true;
      })
      .map(({ i }) => i);
  }

  getValidPupaTargets(): string[] {
    const pendingId = this.state.pendingCardInstanceId;
    if (!pendingId) return [];

    const mode = this.state.pendingTargetMode;
    if (mode !== "pupa" && mode !== "pupa_then_enemy") return [];
    if (mode === "pupa_then_enemy" && this.state.pendingPupaId) return [];

    return this.livingPupae().map((p) => p.id);
  }

  getPendingTargetMode(): PendingTargetMode {
    return this.state.pendingTargetMode;
  }

  getPendingPupaId(): string | null {
    return this.state.pendingPupaId;
  }

  getPendingGeneSpendMax(): number {
    const pendingId = this.state.pendingCardInstanceId;
    if (!pendingId) return 0;
    const card = this.state.hand.find((c) => c.instanceId === pendingId);
    if (!card?.optionalGeneSpendMax) return 0;
    return Math.min(card.optionalGeneSpendMax, this.state.geneMaterial);
  }
}
