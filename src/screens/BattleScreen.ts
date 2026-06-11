import { gameState } from "../core/GameState";
import { getEncounterById } from "../data/enemies";
import { CARD_TEMPLATES } from "../data/cards";
import {
  getPowerDisplayLabel,
  getPowerTooltip,
} from "../types/card";
import type { CardInstance } from "../types/card";
import type { CombatEnemyUnit, EnemyIntentInfo } from "../types/combat";
import type { PupaUnit } from "../types/pupa";
import { showDeckViewModal } from "./DeckViewModal";
import { createTraitsButton } from "./TraitsModal";
import { CONSUMABLE_DEFS } from "../data/consumables";
import { attachStatusTooltip } from "../utils/statusTooltips";
import { createScreenHeader, el } from "../utils/dom";

function renderHpBar(current: number, max: number, side: string): HTMLDivElement {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const bar = el("div", { className: `hp-bar ${side}` });
  const fill = el("div", { className: "hp-bar-fill" });
  fill.style.width = `${pct}%`;
  bar.appendChild(fill);
  bar.appendChild(
    el("span", { className: "hp-bar-text" }, `${current} / ${max}`)
  );
  return bar;
}

function renderPlayerPanel(
  name: string,
  hp: number,
  maxHp: number,
  block: number,
  energy: number,
  maxEnergy: number,
  strength: number,
  strengthLoss: number,
  geneMaterial: number,
  powerStacks: Record<string, number>,
  contribution: number,
  vulnerable: number,
  weak: number,
  blind: number,
  explosionSurgeActive: boolean,
  pupaShieldHp: number
): HTMLDivElement {
  const panel = el("div", { className: "combatant combatant-player" });
  panel.appendChild(el("div", { className: "combatant-icon" }, "🐝"));
  panel.appendChild(el("div", { className: "combatant-name" }, name));
  panel.appendChild(renderHpBar(hp, maxHp, "player"));

  const stats = el("div", { className: "combatant-stats" });
  stats.appendChild(el("span", {}, `⚡ ${energy}/${maxEnergy}`));
  stats.appendChild(el("span", { className: "stat-gene" }, `🧬 ${geneMaterial}`));
  attachStatusTooltip(stats.lastElementChild as HTMLElement, "gene");
  const contribEl = el("span", {}, `⚑ ${contribution}`);
  attachStatusTooltip(contribEl, "contribution");
  stats.appendChild(contribEl);
  if (block > 0) {
    const blockEl = el("span", { className: "stat-block" }, `🛡 ${block}`);
    attachStatusTooltip(blockEl, "block");
    stats.appendChild(blockEl);
  }
  if (pupaShieldHp > 0) {
    stats.appendChild(
      el("span", { className: "stat-pupa-shield" }, `🥚 蛹盾 ${pupaShieldHp}`)
    );
  }
  if (strength > 0) {
    const sEl = el("span", {}, `💪 ${strength}`);
    attachStatusTooltip(sEl, "strength");
    stats.appendChild(sEl);
  }
  if (strengthLoss > 0) {
    const slEl = el(
      "span",
      { className: "status-strength-loss" },
      `失力 ${strengthLoss}`
    );
    attachStatusTooltip(slEl, "strength_loss");
    stats.appendChild(slEl);
  }
  panel.appendChild(stats);

  const debuffCount =
    (vulnerable > 0 ? 1 : 0) +
    (weak > 0 ? 1 : 0) +
    (blind > 0 ? 1 : 0) +
    (explosionSurgeActive ? 1 : 0);
  if (debuffCount > 0) {
    const debuffRow = el("div", { className: "player-debuffs" });
    if (explosionSurgeActive) {
      const surgeEl = el(
        "span",
        { className: "status-explosion-surge" },
        "爆能失控"
      );
      attachStatusTooltip(surgeEl, "explosion_surge");
      debuffRow.appendChild(surgeEl);
    }
    if (vulnerable > 0) {
      const vEl = el("span", { className: "status-vulnerable" }, `易伤 ${vulnerable}`);
      attachStatusTooltip(vEl, "vulnerable");
      debuffRow.appendChild(vEl);
    }
    if (weak > 0) {
      const wEl = el("span", { className: "status-weak" }, `虚弱 ${weak}`);
      attachStatusTooltip(wEl, "weak");
      debuffRow.appendChild(wEl);
    }
    if (blind > 0) {
      const bEl = el("span", { className: "status-blind" }, `致盲 ${blind}`);
      attachStatusTooltip(bEl, "blind");
      debuffRow.appendChild(bEl);
    }
    panel.appendChild(debuffRow);
  }

  const activePowers = Object.entries(powerStacks).filter(([, n]) => n > 0);
  if (activePowers.length > 0) {
    const powerRow = el("div", { className: "player-powers" });
    for (const [powerId, stacks] of activePowers) {
      const badge = el(
        "span",
        { className: "power-badge" },
        getPowerDisplayLabel(powerId, stacks)
      );
      badge.classList.add("has-status-tooltip");
      badge.setAttribute("data-tooltip", getPowerTooltip(powerId));
      powerRow.appendChild(badge);
    }
    panel.appendChild(powerRow);
  }

  return panel;
}

function renderPupaUnit(
  pupa: PupaUnit,
  isTargetable: boolean,
  onTarget?: () => void
): HTMLDivElement {
  const panel = el("div", {
    className: `combatant combatant-pupa${
      isTargetable ? " pupa-targetable" : ""
    }`,
  });

  panel.appendChild(el("div", { className: "combatant-icon" }, pupa.weak ? "🥚" : "🐛"));
  panel.appendChild(
    el("div", { className: "combatant-name" }, pupa.weak ? "虚弱蛹" : "蛹")
  );
  panel.appendChild(renderHpBar(pupa.hp, pupa.maxHp, "player"));

  const stats = el("div", { className: "combatant-stats" });
  if (pupa.block > 0) stats.appendChild(el("span", { className: "stat-block" }, `🛡 ${pupa.block}`));
  if (pupa.attack > 0) stats.appendChild(el("span", {}, `⚔ ${pupa.attack}`));
  if (pupa.strength > 0) stats.appendChild(el("span", {}, `💪 ${pupa.strength}`));
  stats.appendChild(el("span", {}, `⏳ ${pupa.turnsRemaining} 回合`));
  panel.appendChild(stats);

  if (onTarget) {
    panel.addEventListener("click", onTarget);
  }

  return panel;
}

function renderStatusBadges(unit: CombatEnemyUnit): HTMLDivElement {
  const row = el("div", { className: "status-badges" });
  if (unit.weak > 0) {
    const wEl = el("span", { className: "status-weak" }, `虚弱 ${unit.weak}`);
    attachStatusTooltip(wEl, "weak");
    row.appendChild(wEl);
  }
  if (unit.vulnerable > 0) {
    const vEl = el("span", { className: "status-vulnerable" }, `破防 ${unit.vulnerable}`);
    attachStatusTooltip(vEl, "vulnerable");
    row.appendChild(vEl);
  }
  if (unit.tentacleMarked) {
    const mEl = el("span", { className: "status-mark" }, "触部标记");
    attachStatusTooltip(mEl, "tentacle_mark");
    row.appendChild(mEl);
  }
  return row;
}

function renderEnemyUnit(
  unit: CombatEnemyUnit,
  intent: EnemyIntentInfo | undefined,
  encounterIcon: string,
  isTargetable: boolean,
  onTarget?: () => void
): HTMLDivElement {
  const panel = el("div", {
    className: `combatant combatant-enemy combatant-enemy-unit${
      isTargetable ? " enemy-targetable" : ""
    }`,
  });

  if (intent?.intentDamage !== undefined) {
    const intentBadge = el("div", { className: "intent-damage" }, String(intent.intentDamage));
    panel.appendChild(intentBadge);
  }

  panel.appendChild(el("div", { className: "combatant-icon" }, encounterIcon));
  panel.appendChild(el("div", { className: "combatant-name" }, unit.name));
  panel.appendChild(renderHpBar(unit.hp, unit.maxHp, "enemy"));
  panel.appendChild(renderStatusBadges(unit));

  const stats = el("div", { className: "combatant-stats" });
  if (unit.block > 0) stats.appendChild(el("span", { className: "stat-block" }, `🛡 ${unit.block}`));
  if (unit.strength > 0) stats.appendChild(el("span", {}, `💪 ${unit.strength}`));
  if (unit.stunned) stats.appendChild(el("span", {}, "💫 晕眩"));
  if (intent) {
    stats.appendChild(
      el("span", { className: "enemy-intent" }, intent.description)
    );
  }
  panel.appendChild(stats);

  if (onTarget) {
    panel.addEventListener("click", onTarget);
  }

  return panel;
}

function renderHandCard(
  card: CardInstance,
  energy: number,
  effectiveCost: number,
  canPlay: boolean,
  isPending: boolean,
  onPlay: () => void
): HTMLDivElement {
  const playable = canPlay && energy >= effectiveCost;
  let className = `battle-card battle-card--${card.type}`;
  if (card.hiveSpecial) className += " battle-card--hive";
  if (CARD_TEMPLATES[card.templateId]?.federationCybernetic) {
    className += " battle-card--federation-cyber";
  }
  if (isPending) className += " battle-card-pending";
  else if (playable) className += " playable";
  else className += " disabled";

  const cardEl = el("div", { className });

  const costLabel =
    effectiveCost !== card.cost ? `${effectiveCost}(${card.cost})` : String(effectiveCost);
  cardEl.appendChild(el("div", { className: "battle-card-cost" }, costLabel));
  if (card.geneMaterialCost !== undefined && card.geneMaterialCost > 0) {
    cardEl.appendChild(
      el("div", { className: "battle-card-gene-cost" }, `🧬${card.geneMaterialCost}`)
    );
  }

  const tags = el("div", { className: "battle-card-tags" });
  if (card.exhaust) tags.appendChild(el("span", { className: "card-tag-exhaust" }, "消耗"));
  if (card.type === "power") {
    tags.appendChild(el("span", { className: "card-tag-power" }, "能力·一次性"));
  }
  if (tags.childNodes.length > 0) cardEl.appendChild(tags);

  const body = el("div", { className: "battle-card-body" });
  body.appendChild(el("div", { className: "battle-card-name" }, card.name));
  const descEl = el("div", { className: "battle-card-desc" }, card.description);
  body.appendChild(descEl);
  cardEl.appendChild(body);

  cardEl.classList.add("has-status-tooltip");
  cardEl.setAttribute("data-tooltip", card.description);

  if (playable || isPending) {
    cardEl.addEventListener("click", onPlay);
  }

  return cardEl;
}

export function renderBattleScreen(container: HTMLElement): void {
  const state = gameState.getState();
  const combat = state.combat;
  if (!combat) return;

  const encounter = getEncounterById(combat.encounterId);
  const character = state.character;
  const intents = gameState.getCombatIntents();
  const intentMap = new Map(intents.map((i) => [i.unitName, i]));
  const pendingId = combat.pendingCardInstanceId;
  const pendingMode = gameState.getPendingTargetMode();
  const pendingPupaId = gameState.getPendingPupaId();
  const validEnemyTargets = new Set(gameState.getValidEnemyTargets());
  const validPupaTargets = new Set(gameState.getValidPupaTargets());

  let targetHint = "";
  if (combat.pendingConsumableSlot !== null) {
    targetHint = " · 请选择消耗品目标";
  } else if (combat.pendingConsumableCopyCardId) {
    targetHint = " · 记忆复制仪：选择要复制的手牌";
  } else if (pendingId) {
    if (pendingMode === "pupa") targetHint = " · 请选择蛹";
    else if (pendingMode === "pupa_then_enemy" && !pendingPupaId)
      targetHint = " · 请选择蛹";
    else if (pendingMode === "pupa_then_enemy" && pendingPupaId)
      targetHint = " · 请选择敌人";
    else if (pendingMode === "gene_spend") targetHint = " · 选择消耗的基因物质";
    else targetHint = " · 请选择目标";
  }

  const screen = el("div", { className: "screen battle-screen" });

  const headerRow = el("div", { className: "battle-header-row" });
  headerRow.appendChild(
    createScreenHeader(
      `战斗 — ${combat.encounterName}`,
      `第 ${combat.turnNumber} 回合 · ${
        combat.phase === "player_turn" ? "你的回合" : "敌人回合"
      }${targetHint}`
    )
  );
  const deckBtn = el("button", { className: "deck-view-btn" }, "📚 卡组");
  deckBtn.addEventListener("click", () => showDeckViewModal(state.deck, () => {}));
  headerRow.appendChild(deckBtn);
  headerRow.appendChild(
    createTraitsButton(state.traits, state.specialItems)
  );
  screen.appendChild(headerRow);

  const arena = el("div", { className: "battle-arena" });

  const playerSide = el("div", { className: "battle-player-side" });
  const pupaShieldHp = combat.pupae
    .filter((p) => p.hp > 0)
    .reduce((sum, p) => sum + p.hp + p.block, 0);

  playerSide.appendChild(
    renderPlayerPanel(
      character?.name ?? "玩家",
      combat.playerHp,
      combat.playerMaxHp,
      combat.playerBlock,
      combat.energy,
      combat.maxEnergy,
      combat.playerStrength,
      combat.playerStrengthLoss,
      combat.geneMaterial,
      combat.playerPowerStacks,
      combat.factionContribution,
      combat.playerVulnerable,
      combat.playerWeak,
      combat.playerBlind,
      combat.explosionSurgeTurns > 0,
      pupaShieldHp
    )
  );

  if (combat.pupae.length > 0) {
    const pupaeRow = el("div", { className: "battle-pupae" });
    for (const pupa of combat.pupae) {
      if (pupa.hp <= 0) continue;
      const isTargetable = pendingId !== null && validPupaTargets.has(pupa.id);
      const onTarget = isTargetable
        ? () => gameState.playCardOnPupa(pendingId, pupa.id)
        : undefined;
      pupaeRow.appendChild(renderPupaUnit(pupa, isTargetable, onTarget));
    }
    playerSide.appendChild(pupaeRow);
  }
  arena.appendChild(playerSide);

  const enemySide = el("div", { className: "battle-enemies" });
  for (const unit of combat.enemies) {
    if (unit.hp <= 0) continue;

    const isTargetable =
      (pendingId !== null && validEnemyTargets.has(unit.unitIndex)) ||
      (combat.pendingConsumableSlot !== null &&
        validEnemyTargets.has(unit.unitIndex));
    const onTarget = isTargetable
      ? () => {
          if (combat.pendingConsumableSlot !== null) {
            gameState.useConsumableOnTarget(unit.unitIndex);
          } else {
            gameState.playCardOnTarget(pendingId!, unit.unitIndex);
          }
        }
      : undefined;

    enemySide.appendChild(
      renderEnemyUnit(
        unit,
        intentMap.get(unit.name),
        encounter?.icon ?? "👹",
        isTargetable,
        onTarget
      )
    );
  }
  arena.appendChild(enemySide);
  screen.appendChild(arena);

  const piles = el("div", { className: "battle-piles" });
  piles.appendChild(
    el(
      "span",
      {},
      `抽牌堆 ${combat.drawPile.length} · 弃牌堆 ${combat.discardPile.length} · 消耗堆 ${combat.exhaustPile.length} · 手牌 ${combat.hand.length}`
    )
  );
  screen.appendChild(piles);

  const hand = el("div", { className: "battle-hand" });
  const isPlayerTurn = combat.phase === "player_turn";
  const hiveCommunicator = combat.pendingHiveCommunicator;
  const copyPending = combat.pendingConsumableCopyCardId !== null;

  for (const card of combat.hand) {
    hand.appendChild(
      renderHandCard(
        card,
        combat.energy,
        gameState.getEffectiveCardCost(card.instanceId),
        isPlayerTurn &&
          !copyPending &&
          gameState.canPlayCard(card.instanceId),
        card.instanceId === pendingId,
        () => {
          if (copyPending) {
            gameState.resolveConsumableCopy(card.instanceId);
          } else if (card.instanceId === pendingId) {
            gameState.cancelCardTargeting();
          } else {
            gameState.playCard(card.instanceId);
          }
        }
      )
    );
  }
  screen.appendChild(hand);

  const actions = el("div", { className: "battle-actions" });

  if (combat.consumables.length > 0 && isPlayerTurn) {
    const consumableRow = el("div", { className: "battle-consumables" });
    consumableRow.appendChild(el("span", {}, "消耗品："));
    combat.consumables.forEach((slot, index) => {
      const def = CONSUMABLE_DEFS[slot.id];
      const passive = def.passive;
      const btn = el(
        "button",
        {
          className: `btn btn-consumable${
            passive || combat.consumablesLockedThisTurn ? " btn-disabled" : ""
          }`,
        },
        def.name
      );
      btn.classList.add("has-status-tooltip");
      btn.setAttribute("data-tooltip", def.description);
      if (!passive && !combat.consumablesLockedThisTurn) {
        btn.addEventListener("click", () => gameState.useConsumable(index));
      }
      consumableRow.appendChild(btn);
    });
    actions.appendChild(consumableRow);
  }

  if (hiveCommunicator) {
    const row = el("div", { className: "hive-communicator-row" });
    row.appendChild(el("span", {}, "蜂巢联络器：选择一张手牌费用变为 0"));
    for (const id of hiveCommunicator.cardInstanceIds) {
      const card = combat.hand.find((c) => c.instanceId === id);
      if (!card) continue;
      const btn = el("button", { className: "btn btn-hive-comm" }, card.name);
      btn.addEventListener("click", () => gameState.resolveHiveCommunicator(id));
      row.appendChild(btn);
    }
    const skipBtn = el("button", { className: "btn btn-secondary" }, "跳过");
    skipBtn.addEventListener("click", () => gameState.resolveHiveCommunicator(null));
    row.appendChild(skipBtn);
    actions.appendChild(row);
  }
  if (pendingId && pendingMode === "gene_spend") {
    const geneRow = el("div", { className: "gene-spend-row" });
    geneRow.appendChild(el("span", {}, "消耗基因："));
    const maxSpend = gameState.getPendingGeneSpendMax();
    for (let n = 0; n <= maxSpend; n++) {
      const btn = el("button", { className: "btn btn-gene-spend" }, String(n));
      btn.addEventListener("click", () =>
        gameState.playCardWithGeneSpend(pendingId, n)
      );
      geneRow.appendChild(btn);
    }
    actions.appendChild(geneRow);
  }
  if (pendingId) {
    const cancelBtn = el("button", { className: "btn btn-secondary" }, "取消选目标");
    cancelBtn.addEventListener("click", () => gameState.cancelCardTargeting());
    actions.appendChild(cancelBtn);
  }
  const endTurnBtn = el(
    "button",
    {
      className:
        isPlayerTurn &&
        !pendingId &&
        !hiveCommunicator &&
        combat.pendingConsumableSlot === null &&
        !copyPending
          ? "btn"
          : "btn btn-disabled",
    },
    "结束回合"
  );
  if (
    isPlayerTurn &&
    !pendingId &&
    !hiveCommunicator &&
    combat.pendingConsumableSlot === null &&
    !copyPending
  ) {
    endTurnBtn.addEventListener("click", () => gameState.endPlayerTurn());
  } else {
    endTurnBtn.setAttribute("disabled", "true");
  }
  actions.appendChild(endTurnBtn);
  screen.appendChild(actions);

  const logPanel = el("div", { className: "combat-log" });
  for (const entry of combat.combatLog.slice(-12)) {
    logPanel.appendChild(el("div", { className: "combat-log-entry" }, entry));
  }
  screen.appendChild(logPanel);

  container.appendChild(screen);
}
