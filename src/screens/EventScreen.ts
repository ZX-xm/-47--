import { gameState } from "../core/GameState";
import {
  canSelectEventChoice,
  getEventTemplate,
} from "../data/events";
import { SPECIAL_ITEM_LABELS } from "../data/specialItems";
import { createScreenHeader, el } from "../utils/dom";

export function renderEventScreen(container: HTMLElement): void {
  const state = gameState.getState();
  const session = state.event;
  if (!session) return;

  const template = getEventTemplate(session.eventId);
  if (!template) return;

  const screen = el("div", { className: "screen event-screen" });
  screen.appendChild(createScreenHeader(template.title, template.intro));

  if (session.pendingResolution) {
    const result = el("div", { className: "event-result" });
    result.appendChild(
      el("p", { className: "event-result-text" }, session.pendingResolution.narrative)
    );

    const rewards = el("div", { className: "event-rewards" });
    const r = session.pendingResolution;
    if (r.federationCredits) {
      rewards.appendChild(
        el("span", { className: "stat-federation-credits" }, `💎 +${r.federationCredits} 联邦币`)
      );
    }
    if (r.factionContribution) {
      rewards.appendChild(el("span", {}, `⚑ +${r.factionContribution} 阵营贡献`));
    }
    if (r.specialItemId) {
      rewards.appendChild(
        el("span", {}, `获得特殊物品：${SPECIAL_ITEM_LABELS[r.specialItemId]}`)
      );
    }
    if (r.rewardCardNames && r.rewardCardNames.length > 0) {
      for (const name of r.rewardCardNames) {
        rewards.appendChild(
          el(
            "span",
            { className: "event-reward-card stat-federation-credits" },
            `获得卡牌：${name}`
          )
        );
      }
    }
    if (rewards.childNodes.length > 0) {
      result.appendChild(rewards);
    }

    const backBtn = el("button", { className: "btn" }, "返回探索");
    backBtn.addEventListener("click", () => gameState.finishEvent());
    result.appendChild(backBtn);
    screen.appendChild(result);
  } else {
    const choices = el("div", { className: "event-choices" });
    const ctx = {
      geneMaterial: state.geneMaterial,
      factionContribution: state.factionContribution,
      playerHp: state.playerHp,
    };

    for (const choice of template.choices) {
      const enabled = canSelectEventChoice(choice, ctx);
      const btn = el(
        "button",
        {
          className: `btn event-choice-btn${enabled ? "" : " btn-disabled"}`,
        },
        choice.label
      );
      if (enabled) {
        btn.addEventListener("click", () =>
          gameState.selectEventChoice(choice.id)
        );
      }
      choices.appendChild(btn);
    }
    screen.appendChild(choices);
  }

  container.appendChild(screen);
}
