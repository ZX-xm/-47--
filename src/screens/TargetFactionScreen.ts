import { FACTIONS } from "../data/factions";
import { isTargetFactionUnlocked } from "../data/testConfig";
import { gameState } from "../core/GameState";
import { createBreadcrumb } from "./Breadcrumb";
import { getFactionSelectCardClass } from "../utils/factionTheme";
import {
  createBackButton,
  createScreenHeader,
  createSelectCard,
  el,
} from "../utils/dom";

export function renderTargetFactionScreen(container: HTMLElement): void {
  const state = gameState.getState();

  const screen = el("div", { className: "screen" });

  screen.appendChild(createBackButton("← 返回", () => gameState.goBack()));

  const breadcrumb = createBreadcrumb(state);
  if (breadcrumb) screen.appendChild(breadcrumb);

  screen.appendChild(
    createScreenHeader(
      "选择任务阵营",
      "选择你要执行任务的目标阵营（包括自身阵营）"
    )
  );

  const grid = el("div", { className: "card-grid" });

  for (const faction of FACTIONS) {
    const unlocked = isTargetFactionUnlocked(faction.id);
    const isSelf = state.faction?.id === faction.id;
    const desc = isSelf
      ? `${faction.description}（自身阵营）`
      : faction.description;

    grid.appendChild(
      createSelectCard(
        faction.icon,
        faction.name,
        desc,
        !unlocked,
        unlocked ? () => gameState.selectTargetFaction(faction) : undefined,
        getFactionSelectCardClass(faction.id)
      )
    );
  }

  screen.appendChild(grid);
  container.appendChild(screen);
}
