import type { GamePhase } from "../types/game";
import { gameState } from "../core/GameState";
import { clearElement } from "../utils/dom";
import { renderFactionSelectScreen } from "./FactionSelectScreen";
import { renderCharacterSelectScreen } from "./CharacterSelectScreen";
import { renderTargetFactionScreen } from "./TargetFactionScreen";
import { renderMissionSelectScreen } from "./MissionSelectScreen";
import { renderMapScreen } from "./MapScreen";
import { renderBattleScreen } from "./BattleScreen";
import { renderRewardScreen } from "./RewardScreen";
import { renderFactionShopScreen } from "./FactionShopScreen";
import { renderMarketShopScreen } from "./MarketShopScreen";
import { renderGameOverScreen } from "./GameOverScreen";
import { renderEventScreen } from "./EventScreen";
import { renderCombatPreviewScreen } from "./CombatPreviewScreen";
import { isThemedFaction } from "../utils/factionTheme";

export class ScreenManager {
  private container: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  init(): void {
    this.unsubscribe = gameState.subscribe((state) => {
      this.render(state.phase);
    });
    this.render(gameState.getState().phase);
  }

  destroy(): void {
    this.unsubscribe?.();
  }

  private render(phase: GamePhase): void {
    clearElement(this.container);
    this.applyTheme(gameState.getState());

    switch (phase) {
      case "faction_select":
        renderFactionSelectScreen(this.container);
        break;
      case "character_select":
        renderCharacterSelectScreen(this.container);
        break;
      case "target_faction_select":
        renderTargetFactionScreen(this.container);
        break;
      case "mission_select":
        renderMissionSelectScreen(this.container);
        break;
      case "map":
        renderMapScreen(this.container);
        break;
      case "combat":
        renderBattleScreen(this.container);
        break;
      case "reward":
        renderRewardScreen(this.container);
        break;
      case "shop":
        renderMarketShopScreen(this.container);
        break;
      case "faction_shop":
        renderFactionShopScreen(this.container);
        break;
      case "event":
        renderEventScreen(this.container);
        break;
      case "combat_preview":
        renderCombatPreviewScreen(this.container);
        break;
      case "game_over": {
        const state = gameState.getState();
        if (state.gameOverReason === "boss") {
          renderMapScreen(this.container);
        } else if (state.combat) {
          renderBattleScreen(this.container);
        }
        renderGameOverScreen(this.container);
        break;
      }
    }

    const state = gameState.getState();
    if (state.loadingOverlay) {
      const overlay = document.createElement("div");
      overlay.className = "screen-loading-overlay";
      const text = document.createElement("p");
      text.className = "screen-loading-text";
      text.textContent = state.loadingOverlay;
      overlay.appendChild(text);
      this.container.appendChild(overlay);
    }
  }

  private applyTheme(state: ReturnType<typeof gameState.getState>): void {
    const factionId = state.faction?.id;
    if (isThemedFaction(factionId)) {
      this.container.setAttribute("data-theme", factionId);
    } else {
      this.container.removeAttribute("data-theme");
    }
  }
}
