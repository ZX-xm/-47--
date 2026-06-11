import { gameState } from "../core/GameState";
import { getMapDimensions, NODE_RADIUS } from "../core/MapGenerator";
import type { MapData, MapNode, MapNodeType } from "../types/map";
import {
  NODE_TYPE_COLORS,
  NODE_TYPE_ICONS,
  NODE_TYPE_LABELS,
} from "../types/map";
import { createBreadcrumb } from "./Breadcrumb";
import { showDeckViewModal } from "./DeckViewModal";
import { getMapThemeColors } from "../utils/mapTheme";
import { createTraitsButton } from "./TraitsModal";
import { createScreenHeader, el } from "../utils/dom";

function renderConnections(
  svg: SVGSVGElement,
  map: MapData,
  nodeMap: Map<string, MapNode>
): void {
  const linesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  for (const node of map.nodes) {
    for (const targetId of node.connections) {
      const target = nodeMap.get(targetId);
      if (!target) continue;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(node.x));
      line.setAttribute("y1", String(node.y));
      line.setAttribute("x2", String(target.x));
      line.setAttribute("y2", String(target.y));
      line.setAttribute("stroke", "#3a4a6b");
      line.setAttribute("stroke-width", "2");
      linesGroup.appendChild(line);
    }
  }
  svg.appendChild(linesGroup);
}

function getNodeLabel(node: MapNode): string {
  if (node.type === "enemy") return "战斗";
  if (node.type === "elite") return "精英";
  if (node.type === "event") return "事件";
  if (node.type === "shop") return "商店";
  if (node.type === "boss") return "BOSS";
  return NODE_TYPE_LABELS[node.type];
}

function handleNodeClick(nodeId: string): void {
  const action = gameState.getNodeAction(nodeId);
  switch (action) {
    case "combat":
      if (gameState.shouldPreviewCombat(nodeId)) {
        gameState.openCombatPreview(nodeId);
      } else {
        gameState.startCombatAtNode(nodeId);
      }
      break;
    case "event":
      gameState.startEventAtNode(nodeId);
      break;
    case "shop":
      gameState.openMarketShop(nodeId);
      break;
    case "faction_shop":
      gameState.openFactionShop(nodeId);
      break;
    case "skip":
      gameState.skipNode(nodeId, "当前未开放");
      break;
  }
}

function renderNode(
  svg: SVGSVGElement,
  node: MapNode,
  options: {
    isBoss: boolean;
    isAvailable: boolean;
    isCleared: boolean;
    isCurrent: boolean;
    mapColors: ReturnType<typeof getMapThemeColors>;
    onClick?: () => void;
  }
): void {
  const { isBoss, isAvailable, isCleared, isCurrent, mapColors, onClick } = options;
  const { availableStroke, currentStroke, availableLabel } = mapColors;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

  let className = "map-node";
  if (isBoss) className += " map-node-boss";
  if (isAvailable) className += " map-node-available";
  if (isCleared) className += " map-node-cleared";
  if (isCurrent) className += " map-node-current";
  group.setAttribute("class", className);
  group.setAttribute("transform", `translate(${node.x}, ${node.y})`);

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("r", String(isBoss ? NODE_RADIUS + 4 : NODE_RADIUS));
  circle.setAttribute(
    "fill",
    isCleared ? "#555" : NODE_TYPE_COLORS[node.type]
  );
  circle.setAttribute(
    "stroke",
    isAvailable ? availableStroke : isCurrent ? currentStroke : isBoss ? "#fff" : "#1a1a2e"
  );
  circle.setAttribute("stroke-width", isAvailable || isCurrent ? "3" : isBoss ? "3" : "2");
  group.appendChild(circle);

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "text");
  icon.setAttribute("text-anchor", "middle");
  icon.setAttribute("dominant-baseline", "central");
  icon.setAttribute("fill", "#fff");
  icon.setAttribute("font-size", isBoss ? "18" : "16");
  icon.textContent = NODE_TYPE_ICONS[node.type];
  group.appendChild(icon);

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("y", String(NODE_RADIUS + 16));
  label.setAttribute("fill", isAvailable ? availableLabel : "#8892a4");
  label.setAttribute("font-size", "10");
  label.setAttribute("font-family", "Microsoft YaHei, sans-serif");
  label.textContent = getNodeLabel(node);
  group.appendChild(label);

  if (onClick) {
    group.style.cursor = "pointer";
    group.addEventListener("click", onClick);
  }

  svg.appendChild(group);
}

function renderLegend(): HTMLDivElement {
  const legend = el("div", { className: "map-legend" });
  const hiddenTypes = new Set<MapNodeType>([]);
  const types = (Object.entries(NODE_TYPE_LABELS) as [MapNodeType, string][]).filter(
    ([type]) => !hiddenTypes.has(type)
  );

  for (const [type, label] of types) {
    const item = el("div", { className: "legend-item" });
    const dot = el("span", { className: "legend-dot" });
    dot.style.background = NODE_TYPE_COLORS[type];
    item.appendChild(dot);
    item.appendChild(document.createTextNode(type === "enemy" ? "战斗" : label));
    legend.appendChild(item);
  }

  return legend;
}

function renderMapToast(message: string): HTMLDivElement {
  const overlay = el("div", { className: "toast-overlay" });
  const panel = el("div", { className: "toast-panel" });
  panel.appendChild(el("p", { className: "toast-message" }, message));
  const btn = el("button", { className: "btn" }, "确定");
  btn.addEventListener("click", () => gameState.dismissMapToast());
  panel.appendChild(btn);
  overlay.appendChild(panel);
  return overlay;
}

export function renderMapScreen(container: HTMLElement): void {
  const state = gameState.getState();
  const map = state.map;
  if (!map) return;

  const availableIds = new Set(gameState.getAvailableNodeIds());
  const clearedIds = new Set(state.clearedNodeIds);

  const mapColors = getMapThemeColors(state.faction?.id);
  const screen = el("div", { className: "screen map-screen" });

  const breadcrumb = createBreadcrumb(state);
  if (breadcrumb) screen.appendChild(breadcrumb);

  screen.appendChild(
    createScreenHeader(
      "探索地图",
      "沿路径前进：战斗、事件、黑市商店、阵营商店、精英与 BOSS 节点等待探索"
    )
  );

  const statusBar = el("div", { className: "map-status" });
  statusBar.appendChild(el("span", {}, `❤ ${state.playerHp}/${state.playerMaxHp}`));
  statusBar.appendChild(
    el("span", { className: "stat-federation-credits" }, `💎 ${state.federationCredits}`)
  );
  statusBar.appendChild(el("span", {}, `⚑ ${state.factionContribution}`));
  if (state.geneMaterial > 0) {
    statusBar.appendChild(el("span", { className: "stat-gene" }, `🧬 ${state.geneMaterial}`));
  }

  statusBar.appendChild(createTraitsButton(state.traits, state.specialItems));

  const deckBtn = el("button", { className: "deck-view-btn" }, "📚 卡组");
  deckBtn.addEventListener("click", () => {
    showDeckViewModal(state.deck, () => {});
  });
  statusBar.appendChild(deckBtn);
  screen.appendChild(statusBar);

  const mapContainer = el("div", { className: "map-container" });
  const { width, height } = getMapDimensions(map);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "map-svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const nodeMap = new Map(map.nodes.map((n) => [n.id, n]));
  renderConnections(svg, map, nodeMap);

  for (const node of map.nodes) {
    const isBoss = node.id === map.bossNodeId;
    const isCleared = clearedIds.has(node.id);
    const isAvailable = availableIds.has(node.id);
    const isCurrent = node.id === state.currentNodeId;
    const action = gameState.getNodeAction(node.id);
    const onClick = action ? () => handleNodeClick(node.id) : undefined;

    renderNode(svg, node, {
      isBoss,
      isAvailable,
      isCleared,
      isCurrent,
      mapColors,
      onClick,
    });
  }

  mapContainer.appendChild(svg);
  screen.appendChild(mapContainer);
  screen.appendChild(renderLegend());

  container.appendChild(screen);

  if (state.mapToast) {
    container.appendChild(renderMapToast(state.mapToast));
  }
}
