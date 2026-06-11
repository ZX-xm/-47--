import type { GameStateData } from "../types/game";
import { PHASE_LABELS } from "../types/game";
import { el } from "../utils/dom";

export function createBreadcrumb(state: GameStateData): HTMLDivElement | null {
  const items: string[] = [];

  if (state.faction) items.push(state.faction.name);
  if (state.character) items.push(state.character.name);
  if (state.targetFaction) items.push(`任务: ${state.targetFaction.name}`);
  if (state.mission) items.push(state.mission.name);

  const currentPhase = PHASE_LABELS[state.phase];
  if (items.length === 0 && !currentPhase) return null;

  const breadcrumb = el("div", { className: "breadcrumb" });

  items.forEach((item, index) => {
    if (index > 0) {
      breadcrumb.appendChild(el("span", { className: "breadcrumb-sep" }, "›"));
    }
    breadcrumb.appendChild(el("span", { className: "breadcrumb-item" }, item));
  });

  if (currentPhase && state.phase !== "game_over") {
    if (items.length > 0) {
      breadcrumb.appendChild(el("span", { className: "breadcrumb-sep" }, "›"));
    }
    breadcrumb.appendChild(
      el("span", { className: "breadcrumb-item active" }, currentPhase)
    );
  }

  return breadcrumb;
}
