import { isCharacterUnlocked } from "../data/testConfig";
import { gameState } from "../core/GameState";
import { createBreadcrumb } from "./Breadcrumb";
import { getFactionSelectCardClass } from "../utils/factionTheme";
import {
  createBackButton,
  createScreenHeader,
  createSelectCard,
  el,
} from "../utils/dom";

export function renderCharacterSelectScreen(container: HTMLElement): void {
  const state = gameState.getState();
  const faction = state.faction;
  if (!faction) return;

  const screen = el("div", { className: "screen" });

  screen.appendChild(createBackButton("← 返回", () => gameState.goBack()));

  const breadcrumb = createBreadcrumb(state);
  if (breadcrumb) screen.appendChild(breadcrumb);

  screen.appendChild(
    createScreenHeader(
      `选择角色 — ${faction.name}`,
      faction.id === "hive"
        ? "选择你的作战单位 · 雄峰自带遗物「生物能」"
        : "选择你的作战单位"
    )
  );

  const grid = el("div", { className: "card-grid" });

  for (const character of faction.characters) {
    const unlocked = isCharacterUnlocked(faction.id, character.id);
    grid.appendChild(
      createSelectCard(
        faction.icon,
        character.name,
        `${character.description}（${character.energy} 费/回合）`,
        !unlocked,
        unlocked ? () => gameState.selectCharacter(character) : undefined,
        getFactionSelectCardClass(faction.id)
      )
    );
  }

  screen.appendChild(grid);
  container.appendChild(screen);
}
