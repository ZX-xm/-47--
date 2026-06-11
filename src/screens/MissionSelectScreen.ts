import { getMissionsForTarget } from "../data/missions";
import {
  isDifficultyUnlocked,
} from "../data/testConfig";
import { buildInitialDeck } from "../core/DeckBuilder";
import { gameState } from "../core/GameState";
import { DIFFICULTY_LABELS } from "../types/game";
import type { Difficulty } from "../types/game";
import { createBreadcrumb } from "./Breadcrumb";
import { showDeckViewModal } from "./DeckViewModal";
import {
  createBackButton,
  createLockBadge,
  createScreenHeader,
  el,
} from "../utils/dom";

const DIFFICULTY_ORDER: Difficulty[] = [
  "easy",
  "normal",
  "hard",
  "impossible",
];

const DIFFICULTY_ICONS: Record<Difficulty, string> = {
  easy: "🌿",
  normal: "⚔",
  hard: "🔥",
  impossible: "💀",
};

export function renderMissionSelectScreen(container: HTMLElement): void {
  const state = gameState.getState();
  const targetFaction = state.targetFaction;
  if (!targetFaction) return;

  const screen = el("div", { className: "screen" });

  screen.appendChild(createBackButton("← 返回", () => gameState.goBack()));

  const breadcrumb = createBreadcrumb(state);
  if (breadcrumb) screen.appendChild(breadcrumb);

  screen.appendChild(
    createScreenHeader(
      `选择任务 — ${targetFaction.name}`,
      "选择任务难度，开始探索"
    )
  );

  const missions = getMissionsForTarget(targetFaction.id);
  const grid = el("div", { className: "mission-grid" });

  for (const difficulty of DIFFICULTY_ORDER) {
    const mission = missions.find((m) => m.difficulty === difficulty);
    if (!mission) continue;

    const unlocked = isDifficultyUnlocked(difficulty);
    const card = el("div", {
      className: unlocked ? "mission-card" : "mission-card locked",
    });

    if (!unlocked) {
      card.appendChild(createLockBadge());
    }

    card.appendChild(
      el(
        "div",
        { className: "mission-card-image" },
        DIFFICULTY_ICONS[difficulty]
      )
    );

    const body = el("div", { className: "mission-card-body" });
    body.appendChild(
      el("div", { className: "mission-card-name" }, mission.name)
    );
    body.appendChild(
      el(
        "span",
        {
          className: `difficulty-badge difficulty-${difficulty}`,
        },
        DIFFICULTY_LABELS[difficulty]
      )
    );
    card.appendChild(body);

    if (unlocked) {
      card.addEventListener("click", () => {
        gameState.startMissionWithGeneration(mission);
      });
    }

    grid.appendChild(card);
  }

  screen.appendChild(grid);

  const deckBtn = el("button", { className: "deck-view-btn" }, "📚 查看卡组");
  deckBtn.addEventListener("click", () => {
    showDeckViewModal(buildInitialDeck(), () => {});
  });
  screen.appendChild(deckBtn);

  container.appendChild(screen);
}
