import type {
  Character,
  Faction,
  GamePhase,
  GameStateData,
  Mission,
} from "../types/game";
import type { CardInstance } from "../types/card";
import type { MapData, MapNodeType } from "../types/map";
import type { CombatState, RewardState } from "../types/combat";
import type { EventResolution } from "../types/event";
import { CombatEngine } from "./CombatEngine";
import { getEncounterById, pickRandomEncounter } from "../data/enemies";
import {
  addSpecialItemIfNew,
  pickRandomEmpireEventCard,
  pickRandomEventId,
  pickRandomFederationCybernetic,
  pickRandomHiveCard,
  resolveEventChoice,
} from "../data/events";
import { generateShopOffers } from "../data/factionShop";
import { generateMarketShop, getDoctorServiceHeal } from "../data/marketShop";
import { REWARD_FEDERATION_CREDITS } from "../data/cards";
import { buildInitialDeck, createCardFromTemplate, pickRandomRewardCards } from "./DeckBuilder";
import { generateMap } from "./MapGenerator";
import { getVictoryFactionContribution } from "../types/combat";
import type { OwnedConsumable } from "../types/consumable";
import { MAX_CONSUMABLE_SLOTS } from "../types/consumable";
import type { DoctorServiceId } from "../types/shop";
type StateListener = (state: GameStateData) => void;

const COMBAT_NODE_TYPES: MapNodeType[] = ["enemy", "elite", "boss"];

const INITIAL_STATE: GameStateData = {
  phase: "faction_select",
  faction: null,
  character: null,
  targetFaction: null,
  mission: null,
  deck: [],
  map: null,
  playerHp: 0,
  playerMaxHp: 0,
  federationCredits: 0,
  geneMaterial: 0,
  factionContribution: 0,
  traits: [],
  specialItems: [],
  relics: [],
  currentNodeId: null,
  clearedNodeIds: [],
  nodeEvents: {},
  event: null,
  patrolPreviewRemaining: 0,
  combatPreview: null,
  eventCombatReturnNodeId: null,
  combat: null,
  reward: null,
  marketShop: null,
  consumables: [],
  shop: null,
  gameOverReason: null,
  mapToast: null,
  loadingOverlay: null,
};

class GameStateManager {
  private state: GameStateData = { ...INITIAL_STATE };
  private listeners: StateListener[] = [];
  private combatEngine: CombatEngine | null = null;
  private isStartingMission = false;
  getState(): GameStateData {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private setPhase(phase: GamePhase): void {
    this.state = { ...this.state, phase };
    this.notify();
  }

  selectFaction(faction: Faction): void {
    this.state = { ...INITIAL_STATE, faction };
    this.setPhase("character_select");
  }

  selectCharacter(character: Character): void {
    const traits =
      character.id === "drone" ? (["bio_energy"] as string[]) : [];
    this.state = {
      ...this.state,
      character,
      targetFaction: null,
      mission: null,
      deck: [],
      map: null,
      playerHp: character.maxHp,
      playerMaxHp: character.maxHp,
      federationCredits: 0,
      geneMaterial: 0,
      factionContribution: 0,
      traits,
      specialItems: [],
      relics: [],
      currentNodeId: null,
      clearedNodeIds: [],
      nodeEvents: {},
      event: null,
      patrolPreviewRemaining: 0,
      combatPreview: null,
      eventCombatReturnNodeId: null,
      combat: null,
      reward: null,
      marketShop: null,
      consumables: [],
      shop: null,
      gameOverReason: null,
      mapToast: null,
    };
    this.setPhase("target_faction_select");
  }

  selectTargetFaction(faction: Faction): void {
    this.state = {
      ...this.state,
      targetFaction: faction,
      mission: null,
      deck: [],
      map: null,
      currentNodeId: null,
      clearedNodeIds: [],
      nodeEvents: {},
      event: null,
      combatPreview: null,
      combat: null,
      reward: null,
      marketShop: null,
      consumables: [],
      shop: null,
      mapToast: null,
    };
    this.setPhase("mission_select");
  }

  startMissionWithGeneration(mission: Mission): void {
    if (this.isStartingMission) return;
    this.isStartingMission = true;
    this.state = {
      ...this.state,
      loadingOverlay: "正在准备任务，生成地图中…",
    };
    this.notify();

    requestAnimationFrame(() => {
      try {
        const deck = buildInitialDeck();
        const map = generateMap();
        this.isStartingMission = false;
        this.startMission(mission, deck, map);
      } catch (err) {
        console.error("任务启动失败", err);
        this.isStartingMission = false;
        this.state = {
          ...this.state,
          loadingOverlay: null,
          mapToast: "地图生成失败，请重试",
        };
        this.notify();
      }
    });
  }

  startMission(mission: Mission, deck: CardInstance[], map: MapData): void {
    const nodeEvents: Record<string, string> = {};
    for (const node of map.nodes) {
      if (node.type === "event") {
        nodeEvents[node.id] = pickRandomEventId();
      }
    }
    this.state = {
      ...this.state,
      mission,
      deck,
      map,
      nodeEvents,
      currentNodeId: map.startNodeId,
      clearedNodeIds: [],
      event: null,
      combatPreview: null,
      eventCombatReturnNodeId: null,
      combat: null,
      reward: null,
      marketShop: null,
      consumables: [],
      shop: null,
      mapToast: null,
      loadingOverlay: null,
    };
    this.setPhase("map");
  }

  private beginCombat(
    nodeId: string,
    nodeType: MapNodeType,
    encounterId?: string
  ): void {
    const character = this.state.character;
    const factionId = this.state.targetFaction?.id ?? "empire";
    if (!character) return;

    const encounter =
      (encounterId ? getEncounterById(encounterId) : undefined) ??
      pickRandomEncounter(factionId, nodeType);
    if (!encounter) return;

    this.combatEngine = new CombatEngine(
      nodeId,
      nodeType,
      encounter,
      this.state.deck,
      character,
      this.state.playerHp,
      this.state.playerMaxHp,
      this.state.factionContribution,
      this.state.traits,
      this.state.specialItems,
      this.state.consumables
    );
    this.state = {
      ...this.state,
      combat: this.combatEngine.getState(),
      reward: null,
      combatPreview: null,
      mapToast: null,
    };
    this.setPhase("combat");
  }

  startCombatAtNode(nodeId: string, encounterId?: string): void {
    const map = this.state.map;
    if (!map) return;
    const node = map.nodes.find((n) => n.id === nodeId);
    const nodeType = node?.type ?? "enemy";
    this.beginCombat(nodeId, nodeType, encounterId);
  }

  openCombatPreview(nodeId: string): void {
    const map = this.state.map;
    const factionId = this.state.targetFaction?.id ?? "empire";
    if (!map) return;
    const node = map.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const encounter = pickRandomEncounter(factionId, node.type);
    if (!encounter) return;
    this.state = {
      ...this.state,
      combatPreview: {
        nodeId,
        encounterId: encounter.id,
        encounterName: encounter.name,
        encounterDescription: encounter.description,
      },
    };
    this.setPhase("combat_preview");
  }

  confirmCombatPreview(): void {
    const preview = this.state.combatPreview;
    if (!preview) return;
    const map = this.state.map;
    const node = map?.nodes.find((n) => n.id === preview.nodeId);
    if (this.state.patrolPreviewRemaining > 0) {
      this.state = {
        ...this.state,
        patrolPreviewRemaining: this.state.patrolPreviewRemaining - 1,
      };
    }
    this.beginCombat(
      preview.nodeId,
      node?.type ?? "enemy",
      preview.encounterId
    );
  }

  skipCombatPreview(): void {
    const preview = this.state.combatPreview;
    if (!preview) return;
    if (this.state.patrolPreviewRemaining > 0) {
      this.state = {
        ...this.state,
        patrolPreviewRemaining: this.state.patrolPreviewRemaining - 1,
      };
    }
    this.advanceToNode(preview.nodeId);
    this.state = { ...this.state, combatPreview: null };
    this.setPhase("map");
  }

  startEventAtNode(nodeId: string): void {
    const eventId = this.state.nodeEvents[nodeId];
    if (!eventId) return;
    this.state = {
      ...this.state,
      event: {
        nodeId,
        eventId,
        pendingResolution: null,
        pendingCombatEncounterId: null,
        postCombatResolution: null,
      },
    };
    this.setPhase("event");
  }

  selectEventChoice(choiceId: string): void {
    const session = this.state.event;
    if (!session || session.pendingResolution) return;

    const resolution = resolveEventChoice(session.eventId, choiceId);
    if (resolution.combatEncounterId) {
      this.state = {
        ...this.state,
        event: {
          ...session,
          pendingCombatEncounterId: resolution.combatEncounterId,
          postCombatResolution: resolution,
        },
        eventCombatReturnNodeId: session.nodeId,
      };
      this.beginCombat(session.nodeId, "enemy", resolution.combatEncounterId);
      return;
    }

    this.applyEventResolution(resolution, session.nodeId);
  }

  private applyEventResolution(resolution: EventResolution, nodeId: string): void {
    let deck = this.state.deck;
    const rewardCardNames: string[] = [];

    if (resolution.cardTemplateId) {
      const card = createCardFromTemplate(resolution.cardTemplateId);
      deck = [...deck, card];
      rewardCardNames.push(card.name);
    }
    if (resolution.randomHiveCard) {
      const card = pickRandomHiveCard();
      deck = [...deck, card];
      rewardCardNames.push(card.name);
    }
    if (resolution.randomFederationCybernetic) {
      const card = pickRandomFederationCybernetic();
      deck = [...deck, card];
      rewardCardNames.push(card.name);
    }
    if (resolution.randomEmpireEventCard) {
      const card = pickRandomEmpireEventCard();
      deck = [...deck, card];
      rewardCardNames.push(card.name);
    }

    let specialItems = this.state.specialItems;
    if (resolution.specialItemId) {
      specialItems = addSpecialItemIfNew(
        specialItems,
        resolution.specialItemId
      );
    }

    let patrolPreviewRemaining = this.state.patrolPreviewRemaining;
    if (resolution.specialItemId === "border_patrol_map") {
      patrolPreviewRemaining = 4;
    }

    this.advanceToNode(nodeId);
    this.state = {
      ...this.state,
      deck,
      specialItems,
      patrolPreviewRemaining,
      federationCredits:
        this.state.federationCredits + (resolution.federationCredits ?? 0),
      factionContribution:
        this.state.factionContribution +
        (resolution.factionContribution ?? 0) -
        (resolution.consumeContribution ?? 0),
      geneMaterial:
        this.state.geneMaterial +
        (resolution.geneMaterial ?? 0) -
        (resolution.consumeGene ?? 0),
      playerHp: Math.max(
        0,
        Math.min(
          this.state.playerMaxHp,
          this.state.playerHp + (resolution.hpChange ?? 0)
        )
      ),
      event: {
        nodeId,
        eventId: this.state.event?.eventId ?? "",
        pendingResolution: {
          ...resolution,
          rewardCardNames:
            rewardCardNames.length > 0 ? rewardCardNames : resolution.rewardCardNames,
        },
        pendingCombatEncounterId: null,
        postCombatResolution: null,
      },
    };
    this.notify();
  }

  finishEvent(): void {
    this.state = { ...this.state, event: null };
    this.setPhase("map");
  }

  playCard(
    cardInstanceId: string,
    targetIndex?: number,
    pupaId?: string,
    geneSpend?: number
  ): void {
    if (!this.combatEngine) return;
    const combat = this.combatEngine.playCard(
      cardInstanceId,
      targetIndex,
      pupaId,
      geneSpend
    );
    this.syncCombatState(combat);
    if (combat.phase === "victory") {
      this.handleCombatVictory(combat);
    } else {
      this.notify();
    }
  }

  playCardOnTarget(cardInstanceId: string, targetIndex: number): void {
    if (!this.combatEngine) return;
    const combat = this.combatEngine.playCardOnTarget(
      cardInstanceId,
      targetIndex
    );
    this.syncCombatState(combat);
    if (combat.phase === "victory") {
      this.handleCombatVictory(combat);
    } else {
      this.notify();
    }
  }

  playCardWithGeneSpend(cardInstanceId: string, geneSpend: number): void {
    this.playCard(cardInstanceId, undefined, undefined, geneSpend);
  }

  playCardOnPupa(cardInstanceId: string, pupaId: string): void {
    if (!this.combatEngine) return;
    const combat = this.combatEngine.playCardOnPupa(cardInstanceId, pupaId);
    this.syncCombatState(combat);
    if (combat.phase === "victory") {
      this.handleCombatVictory(combat);
    } else {
      this.notify();
    }
  }

  resolveHiveCommunicator(cardInstanceId: string | null): void {
    if (!this.combatEngine) return;
    const combat = this.combatEngine.resolveHiveCommunicator(cardInstanceId);
    this.syncCombatState(combat);
    this.notify();
  }

  cancelCardTargeting(): void {
    if (!this.combatEngine) return;
    this.combatEngine.cancelTargeting();
    this.state = { ...this.state, combat: this.combatEngine.getState() };
    this.notify();
  }

  getValidEnemyTargets(): number[] {
    return this.combatEngine?.getValidEnemyTargets() ?? [];
  }

  getValidPupaTargets(): string[] {
    return this.combatEngine?.getValidPupaTargets() ?? [];
  }

  getPendingTargetMode() {
    return this.combatEngine?.getPendingTargetMode() ?? null;
  }

  getPendingPupaId(): string | null {
    return this.combatEngine?.getPendingPupaId() ?? null;
  }

  getPendingGeneSpendMax(): number {
    return this.combatEngine?.getPendingGeneSpendMax() ?? 0;
  }

  getValidTargets(): number[] {
    return this.getValidEnemyTargets();
  }

  canPlayCard(cardInstanceId: string): boolean {
    const combat = this.state.combat;
    if (!combat || !this.combatEngine) return false;
    const card = combat.hand.find((c) => c.instanceId === cardInstanceId);
    if (!card) return false;
    return this.combatEngine.canPlayCard(card);
  }

  getEffectiveCardCost(cardInstanceId: string): number {
    const combat = this.state.combat;
    if (!combat || !this.combatEngine) return 0;
    const card = combat.hand.find((c) => c.instanceId === cardInstanceId);
    if (!card) return 0;
    return this.combatEngine.getEffectiveCardCost(card);
  }

  hasPendingHiveCommunicator(): boolean {
    return this.state.combat?.pendingHiveCommunicator != null;
  }

  private syncCombatState(combat: CombatState): void {
    this.state = {
      ...this.state,
      combat,
      playerHp: combat.playerHp,
      playerMaxHp: combat.playerMaxHp,
      factionContribution: combat.factionContribution,
      geneMaterial: combat.geneMaterial,
      consumables: combat.consumables,
    };
  }

  endPlayerTurn(): void {
    if (!this.combatEngine) return;
    const combat = this.combatEngine.endPlayerTurn();
    this.syncCombatState(combat);
    if (combat.phase === "defeat") {
      this.handleCombatDefeat();
    } else if (combat.phase === "victory") {
      this.handleCombatVictory(combat);
    } else {
      this.notify();
    }
  }

  private handleCombatDefeat(): void {
    this.state.gameOverReason = "defeat";
    this.combatEngine = null;
    this.setPhase("game_over");
  }

  private handleCombatVictory(combat: CombatState): void {
    this.combatEngine = null;

    if (this.state.eventCombatReturnNodeId) {
      const nodeId = this.state.eventCombatReturnNodeId;
      const post = this.state.event?.postCombatResolution;
      const merged: EventResolution = {
        narrative:
          post?.combatEncounterId === "event_deserter_pursuit"
            ? "追兵被击溃。平民安全了，你记下了帝国机甲的弱点。"
            : post?.combatEncounterId === "event_interrogation_rescue"
              ? "帝国哨兵被击败，平民将情报藏在了你手中。"
              : post?.combatEncounterId === "event_mutant_beetles"
                ? "变异甲虫被消灭，你从甲壳中提炼出防护碎片。"
                : "战斗胜利。",
        federationCredits: post?.postCombatCredits,
        specialItemId: post?.postCombatSpecialItemId,
      };
      this.state = {
        ...this.state,
        combat: null,
        eventCombatReturnNodeId: null,
        playerHp: combat.playerHp,
        playerMaxHp: combat.playerMaxHp,
        geneMaterial: combat.geneMaterial,
        consumables: combat.consumables,
      };
      this.applyEventResolution(merged, nodeId);
      this.setPhase("event");
      return;
    }

    const contributionGain = getVictoryFactionContribution(combat.nodeType);

    if (combat.nodeType === "boss") {
      this.advanceToNode(combat.nodeId);
      this.state = {
        ...this.state,
        combat: null,
        reward: null,
        playerHp: combat.playerHp,
        geneMaterial: combat.geneMaterial,
        factionContribution: this.state.factionContribution + contributionGain,
        gameOverReason: "boss",
      };
      this.setPhase("game_over");
      return;
    }

    if (combat.skipCombatReward) {
      this.advanceToNode(combat.nodeId);
      this.state = {
        ...this.state,
        combat: null,
        reward: null,
        playerHp: combat.playerHp,
        playerMaxHp: combat.playerMaxHp,
        geneMaterial: combat.geneMaterial,
        consumables: combat.consumables,
      };
      this.setPhase("map");
      return;
    }

    const characterId = this.state.character?.id ?? "drone";
    const reward: RewardState = {
      federationCredits: REWARD_FEDERATION_CREDITS,
      factionContribution: contributionGain,
      cardChoices: pickRandomRewardCards(characterId, 3),
      nodeId: combat.nodeId,
    };
    this.state = {
      ...this.state,
      combat,
      reward,
      playerHp: combat.playerHp,
      playerMaxHp: combat.playerMaxHp,
      geneMaterial: combat.geneMaterial,
      consumables: combat.consumables,
      factionContribution: this.state.factionContribution + contributionGain,
    };
    this.setPhase("reward");
  }

  selectRewardCard(card: CardInstance): void {
    const reward = this.state.reward;
    if (!reward) return;
    this.advanceToNode(reward.nodeId);
    this.state = {
      ...this.state,
      deck: [...this.state.deck, card],
      federationCredits:
        this.state.federationCredits + reward.federationCredits,
      combat: null,
      reward: null,
    };
    this.setPhase("map");
  }

  private advanceToNode(nodeId: string): void {
    this.state = {
      ...this.state,
      currentNodeId: nodeId,
      clearedNodeIds: this.state.clearedNodeIds.includes(nodeId)
        ? this.state.clearedNodeIds
        : [...this.state.clearedNodeIds, nodeId],
    };
  }

  skipNode(nodeId: string, message = "当前未开放"): void {
    if (!this.getAvailableNodeIds().includes(nodeId)) return;
    this.advanceToNode(nodeId);
    this.state = { ...this.state, mapToast: message };
    this.notify();
  }

  dismissMapToast(): void {
    this.state = { ...this.state, mapToast: null };
    this.notify();
  }

  getCombatIntents() {
    return this.combatEngine?.getEnemyIntents() ?? [];
  }

  getAvailableNodeIds(): string[] {
    const map = this.state.map;
    const currentId = this.state.currentNodeId;
    if (!map || !currentId) return [];

    const currentNode = map.nodes.find((n) => n.id === currentId);
    if (!currentNode) return [];

    const ids = currentNode.connections.filter(
      (id) => !this.state.clearedNodeIds.includes(id)
    );

    if (
      COMBAT_NODE_TYPES.includes(currentNode.type) &&
      !this.state.clearedNodeIds.includes(currentNode.id) &&
      !ids.includes(currentNode.id)
    ) {
      ids.unshift(currentNode.id);
    }

    return ids;
  }

  isNodeClickable(nodeId: string): boolean {
    return this.getAvailableNodeIds().includes(nodeId);
  }

  getNodeAction(
    nodeId: string
  ): "combat" | "event" | "shop" | "skip" | "faction_shop" | null {
    const map = this.state.map;
    if (!map || !this.isNodeClickable(nodeId)) return null;

    const node = map.nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    if (node.type === "faction_shop") return "faction_shop";
    if (node.type === "shop") return "shop";
    if (node.type === "event") return "event";
    if (COMBAT_NODE_TYPES.includes(node.type)) return "combat";
    return null;
  }

  shouldPreviewCombat(nodeId: string): boolean {
    return (
      this.state.patrolPreviewRemaining > 0 &&
      this.getNodeAction(nodeId) === "combat" &&
      !this.state.eventCombatReturnNodeId
    );
  }

  openMarketShop(nodeId: string): void {
    this.state = {
      ...this.state,
      marketShop: generateMarketShop(nodeId),
      mapToast: null,
    };
    this.setPhase("shop");
  }

  buyDoctorService(serviceId: DoctorServiceId): void {
    const market = this.state.marketShop;
    if (!market) return;
    const service = market.doctorServices.find((s) => s.id === serviceId);
    if (!service) return;

    if (service.currency === "credits") {
      if (this.state.federationCredits < service.price) return;
      const result = getDoctorServiceHeal(
        serviceId,
        this.state.playerHp,
        this.state.playerMaxHp
      );
      this.state = {
        ...this.state,
        federationCredits: this.state.federationCredits - service.price,
        playerHp: result.hp,
        playerMaxHp: result.maxHp ?? this.state.playerMaxHp,
      };
    } else {
      if (this.state.factionContribution < service.price) return;
      const result = getDoctorServiceHeal(
        serviceId,
        this.state.playerHp,
        this.state.playerMaxHp
      );
      this.state = {
        ...this.state,
        factionContribution: this.state.factionContribution - service.price,
        playerHp: result.hp,
        playerMaxHp: result.maxHp ?? this.state.playerMaxHp,
      };
    }
    this.notify();
  }

  buyTrainerCard(templateId: string): void {
    const market = this.state.marketShop;
    if (!market) return;
    const offer = market.trainerOffers.find((o) => o.templateId === templateId);
    if (!offer) return;
    if (this.state.federationCredits < offer.price) return;
    if (
      offer.requiresContribution !== undefined &&
      this.state.factionContribution < offer.requiresContribution
    ) {
      return;
    }
    this.state = {
      ...this.state,
      deck: [...this.state.deck, offer.card],
      federationCredits: this.state.federationCredits - offer.price,
      marketShop: {
        ...market,
        trainerOffers: market.trainerOffers.filter(
          (o) => o.templateId !== templateId
        ),
      },
    };
    this.notify();
  }

  buyMarketConsumable(consumableId: OwnedConsumable["id"]): void {
    const market = this.state.marketShop;
    if (!market) return;
    if (this.state.consumables.length >= MAX_CONSUMABLE_SLOTS) return;

    const common = market.dealerCommon.find((c) => c.id === consumableId);
    const rare =
      market.dealerRare?.id === consumableId ? market.dealerRare : null;
    const offer = common ?? rare;
    if (!offer) return;
    if (this.state.federationCredits < offer.price) return;

    this.state = {
      ...this.state,
      federationCredits: this.state.federationCredits - offer.price,
      consumables: [...this.state.consumables, { id: consumableId }],
    };
    this.notify();
  }

  leaveMarketShop(): void {
    const market = this.state.marketShop;
    if (!market) return;
    this.advanceToNode(market.nodeId);
    this.state = { ...this.state, marketShop: null };
    this.setPhase("map");
  }

  useConsumable(slotIndex: number): void {
    if (!this.combatEngine) return;
    const combat = this.combatEngine.useConsumable(slotIndex);
    this.syncCombatState(combat);
    if (combat.phase === "victory") {
      this.handleCombatVictory(combat);
    } else if (combat.phase === "defeat") {
      this.handleCombatDefeat();
    } else {
      this.notify();
    }
  }

  resolveConsumableCopy(cardInstanceId: string): void {
    if (!this.combatEngine) return;
    const combat = this.combatEngine.resolveConsumableCopy(cardInstanceId);
    this.syncCombatState(combat);
    this.notify();
  }

  useConsumableOnTarget(targetIndex: number): void {
    if (!this.combatEngine) return;
    const combat = this.combatEngine.useConsumableOnTarget(targetIndex);
    this.syncCombatState(combat);
    if (combat.phase === "victory") {
      this.handleCombatVictory(combat);
    } else if (combat.phase === "defeat") {
      this.handleCombatDefeat();
    } else {
      this.notify();
    }
  }

  openFactionShop(nodeId: string): void {
    const factionId = this.state.faction?.id ?? "hive";
    const offers = generateShopOffers(factionId, 6);
    this.state = {
      ...this.state,
      shop: { nodeId, offers },
      mapToast: null,
    };
    this.setPhase("faction_shop");
  }

  buyShopCard(templateId: string): void {
    const shop = this.state.shop;
    if (!shop) return;
    const offer = shop.offers.find((o) => o.templateId === templateId);
    if (!offer) return;
    if (this.state.factionContribution < offer.price) return;
    this.state = {
      ...this.state,
      deck: [...this.state.deck, offer.card],
      factionContribution: this.state.factionContribution - offer.price,
      shop: {
        ...shop,
        offers: shop.offers.filter((o) => o.templateId !== templateId),
      },
    };
    this.notify();
  }

  leaveShop(): void {
    const shop = this.state.shop;
    if (!shop) return;
    this.advanceToNode(shop.nodeId);
    this.state = { ...this.state, shop: null };
    this.setPhase("map");
  }

  endGame(): void {
    this.state.gameOverReason = "boss";
    this.setPhase("game_over");
  }

  reset(): void {
    this.combatEngine = null;
    this.state = { ...INITIAL_STATE };
    this.notify();
  }

  goBack(): void {
    switch (this.state.phase) {
      case "character_select":
        this.state = { ...INITIAL_STATE };
        this.notify();
        break;
      case "target_faction_select":
        this.setPhase("character_select");
        break;
      case "mission_select":
        this.setPhase("target_faction_select");
        break;
      default:
        break;
    }
  }
}

export const gameState = new GameStateManager();
