import { FACTIONS } from "../data/factions";
import { isFactionUnlocked } from "../data/testConfig";
import { gameState } from "../core/GameState";
import { createBreadcrumb } from "./Breadcrumb";
import { getFactionSelectCardClass } from "../utils/factionTheme";
import {
  createScreenHeader,
  createSelectCard,
  el,
} from "../utils/dom";

export function renderFactionSelectScreen(container: HTMLElement): void {
  const screen = el("div", { className: "screen" });

  const breadcrumb = createBreadcrumb(gameState.getState());
  if (breadcrumb) screen.appendChild(breadcrumb);

  screen.appendChild(
    createScreenHeader("选择阵营", "选择你所属的阵营，开始冒险")
  );

  const grid = el("div", { className: "card-grid" });

  for (const faction of FACTIONS) {
    const unlocked = isFactionUnlocked(faction.id);
    grid.appendChild(
      createSelectCard(
        faction.icon,
        faction.name,
        faction.description,
        !unlocked,
        unlocked ? () => gameState.selectFaction(faction) : undefined,
        getFactionSelectCardClass(faction.id)
      )
    );
  }

  screen.appendChild(grid);
  container.appendChild(screen);
}
