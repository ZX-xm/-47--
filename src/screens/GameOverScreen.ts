import { gameState } from "../core/GameState";
import { el } from "../utils/dom";

export function renderGameOverScreen(container: HTMLElement): void {
  const state = gameState.getState();
  const overlay = el("div", { className: "game-over-overlay" });
  const panel = el("div", { className: "game-over-panel" });

  const title =
    state.gameOverReason === "defeat"
      ? "你被击败了"
      : "此局游戏结束";

  const subtitle =
    state.gameOverReason === "defeat"
      ? "敌人获得了胜利，返回主菜单重新开始"
      : "恭喜完成本次探索";

  panel.appendChild(el("h2", { className: "game-over-title" }, title));
  panel.appendChild(el("p", { className: "game-over-subtitle" }, subtitle));

  const btn = el("button", { className: "btn" }, "返回主菜单");
  btn.addEventListener("click", () => gameState.reset());
  panel.appendChild(btn);

  overlay.appendChild(panel);
  container.appendChild(overlay);
}
