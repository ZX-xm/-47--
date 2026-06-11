import type { FactionId } from "../types/game";
import { isThemedFaction } from "./factionTheme";

export interface MapThemeColors {
  availableStroke: string;
  currentStroke: string;
  availableLabel: string;
}

const MAP_THEME_COLORS: Partial<Record<FactionId, MapThemeColors>> = {
  hive: {
    availableStroke: "#b026ff",
    currentStroke: "#00f5ff",
    availableLabel: "#c77dff",
  },
  mech: {
    availableStroke: "#ff9500",
    currentStroke: "#ffb347",
    availableLabel: "#ffaa33",
  },
  federation: {
    availableStroke: "#4dabf7",
    currentStroke: "#74c0fc",
    availableLabel: "#91a7ff",
  },
  empire: {
    availableStroke: "#00ff88",
    currentStroke: "#39ff14",
    availableLabel: "#00ff88",
  },
  calamity: {
    availableStroke: "#ff4757",
    currentStroke: "#ff6b81",
    availableLabel: "#ffa8a8",
  },
  matrix: {
    availableStroke: "#22d3ee",
    currentStroke: "#06b6d4",
    availableLabel: "#67e8f9",
  },
};

const DEFAULT_MAP_COLORS: MapThemeColors = {
  availableStroke: "#4ecca3",
  currentStroke: "#457b9d",
  availableLabel: "#4ecca3",
};

export function getMapThemeColors(factionId?: FactionId): MapThemeColors {
  if (!factionId) return DEFAULT_MAP_COLORS;
  return MAP_THEME_COLORS[factionId] ?? DEFAULT_MAP_COLORS;
}

export { isThemedFaction };
