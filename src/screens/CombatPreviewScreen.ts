import { gameState } from "../core/GameState";
import { createScreenHeader, el } from "../utils/dom";

export function renderCombatPreviewScreen(container: HTMLElement): void {
  const preview = gameState.getState().combatPreview;
  if (!preview) return;

  const screen = el("div", { className: "screen combat-preview-screen" });
  screen.appendChild(
    createScreenHeader("遭遇预览", "边境巡逻路线图显示了前方敌情")
  );

  const panel = el("div", { className: "combat-preview-panel" });
  panel.appendChild(el("h3", { className: "preview-encounter-name" }, preview.encounterName));
  panel.appendChild(
    el("p", { className: "preview-encounter-desc" }, preview.encounterDescription)
  );

  const actions = el("div", { className: "combat-preview-actions" });
  const fightBtn = el("button", { className: "btn" }, "迎战");
  fightBtn.addEventListener("click", () => gameState.confirmCombatPreview());
  const skipBtn = el("button", { className: "btn btn-secondary" }, "躲避");
  skipBtn.addEventListener("click", () => gameState.skipCombatPreview());
  actions.appendChild(fightBtn);
  actions.appendChild(skipBtn);
  panel.appendChild(actions);
  screen.appendChild(panel);

  container.appendChild(screen);
}
