import { gameState } from "../core/GameState";
import type { CardInstance } from "../types/card";
import { CARD_TEMPLATES } from "../data/cards";
import { createScreenHeader, el } from "../utils/dom";

function renderRewardCard(card: CardInstance, onSelect: () => void): HTMLDivElement {
  let className = `reward-card battle-card--${card.type}`;
  if (card.hiveSpecial) className += " battle-card--hive";
  if (CARD_TEMPLATES[card.templateId]?.federationCybernetic) {
    className += " battle-card--federation-cyber";
  }
  const cardEl = el("div", { className });
  cardEl.appendChild(el("div", { className: "battle-card-cost" }, String(card.cost)));
  const body = el("div", { className: "battle-card-body" });
  body.appendChild(el("div", { className: "battle-card-name" }, card.name));
  body.appendChild(el("div", { className: "battle-card-desc" }, card.description));
  cardEl.appendChild(body);
  cardEl.addEventListener("click", onSelect);
  return cardEl;
}

export function renderRewardScreen(container: HTMLElement): void {
  const state = gameState.getState();
  const reward = state.reward;
  if (!reward) return;

  const screen = el("div", { className: "screen reward-screen" });

  screen.appendChild(createScreenHeader("战斗胜利！", "选择你的奖励"));

  const summary = el("div", { className: "reward-summary" });
  summary.appendChild(
    el(
      "div",
      { className: "reward-item stat-federation-credits" },
      `💎 联邦币 +${reward.federationCredits}`
    )
  );
  summary.appendChild(
    el("div", { className: "reward-item" }, `⚑ 阵营贡献 +${reward.factionContribution}`)
  );
  screen.appendChild(summary);

  screen.appendChild(el("h3", { className: "reward-subtitle" }, "卡牌三选一"));

  const cards = el("div", { className: "reward-cards" });
  for (const card of reward.cardChoices) {
    cards.appendChild(
      renderRewardCard(card, () => gameState.selectRewardCard(card))
    );
  }
  screen.appendChild(cards);

  container.appendChild(screen);
}
