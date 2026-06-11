import type { MapData, MapNode, MapNodeType } from "../types/map";

const LAYER_COUNT = 15;
const NODE_RADIUS = 22;
const LAYER_HEIGHT = 80;
const COLUMN_WIDTH = 100;
const MAP_PADDING_X = 80;
const MAP_PADDING_Y = 60;

function randomInt(min: number, max: number): number {
  if (min > max) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickTypeForLayer(layer: number): MapNodeType {
  const progress = layer / (LAYER_COUNT - 1);
  const roll = Math.random();

  // 前段：事件与黑市、阵营商店
  if (progress < 0.2) {
    if (roll < 0.28) return "event";
    if (roll < 0.38) return "shop";
    if (roll < 0.48) return "faction_shop";
    return "enemy";
  }
  if (progress < 0.45) {
    if (roll < 0.24) return "event";
    if (roll < 0.32) return "shop";
    if (roll < 0.4) return "faction_shop";
    if (roll < 0.58) return "elite";
    return "enemy";
  }
  if (progress < 0.75) {
    if (roll < 0.18) return "event";
    if (roll < 0.24) return "shop";
    if (roll < 0.3) return "faction_shop";
    if (roll < 0.56) return "elite";
    return "enemy";
  }
  if (roll < 0.14) return "event";
  if (roll < 0.19) return "shop";
  if (roll < 0.24) return "faction_shop";
  if (roll < 0.56) return "elite";
  return "enemy";
}

/** 避免随机结果过少：保证每张图至少有若干事件与阵营商店 */
function ensureMapVariety(nodes: MapNode[]): void {
  const MIN_EVENTS = 3;
  const MIN_FACTION_SHOPS = 2;
  const MIN_MARKET_SHOPS = 2;
  const maxLayer = LAYER_COUNT - 2;

  const countType = (type: MapNodeType) =>
    nodes.filter((n) => n.type === type).length;

  const convertible = (node: MapNode, avoidLayers: number[]) =>
    node.type === "enemy" &&
    node.layer > 0 &&
    node.layer <= maxLayer &&
    !avoidLayers.includes(node.layer);

  const convertNodes = (
    targetType: MapNodeType,
    needed: number,
    avoidLayers: number[] = []
  ) => {
    if (needed <= 0) return;
    const candidates = nodes.filter((n) => convertible(n, avoidLayers));
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
    }
    for (let i = 0; i < Math.min(needed, candidates.length); i++) {
      candidates[i]!.type = targetType;
    }
  };

  convertNodes("event", MIN_EVENTS - countType("event"), [1]);
  convertNodes("faction_shop", MIN_FACTION_SHOPS - countType("faction_shop"), [
    1,
    2,
  ]);
  convertNodes("shop", MIN_MARKET_SHOPS - countType("shop"), [1, 2, 3]);
}

function generateLayerSizes(): number[] {
  const sizes: number[] = [1];
  for (let i = 1; i < LAYER_COUNT - 1; i++) {
    sizes.push(randomInt(2, 3));
  }
  sizes.push(1);
  return sizes;
}

function buildConnections(nodesByLayer: MapNode[][]): void {
  for (let layer = 0; layer < nodesByLayer.length - 1; layer++) {
    const currentLayer = nodesByLayer[layer]!;
    const nextLayer = nodesByLayer[layer + 1]!;

    if (currentLayer.length === 0 || nextLayer.length === 0) continue;

    for (let i = 0; i < currentLayer.length; i++) {
      const node = currentLayer[i]!;
      const minCol = Math.max(0, i - 1);
      const maxCol = Math.min(nextLayer.length - 1, i + 1);
      const lo = Math.min(minCol, maxCol);
      const hi = Math.max(minCol, maxCol);

      if (layer === 0) {
        for (let j = lo; j <= hi; j++) {
          const target = nextLayer[j];
          if (!target) continue;
          if (!node.connections.includes(target.id)) {
            node.connections.push(target.id);
          }
        }
      } else {
        const target = nextLayer[randomInt(lo, hi)];
        if (target && !node.connections.includes(target.id)) {
          node.connections.push(target.id);
        }
      }
    }

    for (let j = 0; j < nextLayer.length; j++) {
      const targetId = nextLayer[j]!.id;
      const hasIncoming = currentLayer.some((n) =>
        n.connections.includes(targetId)
      );
      if (!hasIncoming) {
        const minSource = Math.max(0, j - 1);
        const maxSource = Math.min(currentLayer.length - 1, j + 1);
        const srcLo = Math.min(minSource, maxSource);
        const srcHi = Math.max(minSource, maxSource);
        const sourceNode = currentLayer[randomInt(srcLo, srcHi)];
        if (sourceNode && !sourceNode.connections.includes(targetId)) {
          sourceNode.connections.push(targetId);
        }
      }
    }
  }
}

function assignPositions(nodesByLayer: MapNode[][], layerSizes: number[]): void {
  const maxColumns = Math.max(...layerSizes);
  const mapWidth = maxColumns * COLUMN_WIDTH + MAP_PADDING_X * 2;

  for (let layer = 0; layer < nodesByLayer.length; layer++) {
    const layerNodes = nodesByLayer[layer]!;
    const count = layerNodes.length;
    const totalWidth = (count - 1) * COLUMN_WIDTH;
    const startX = (mapWidth - totalWidth) / 2;

    for (let col = 0; col < count; col++) {
      const node = layerNodes[col]!;
      node.x = startX + col * COLUMN_WIDTH;
      node.y = MAP_PADDING_Y + layer * LAYER_HEIGHT;
    }
  }
}

export function generateMap(): MapData {
  const layerSizes = generateLayerSizes();
  const nodesByLayer: MapNode[][] = [];
  const allNodes: MapNode[] = [];
  let nodeIndex = 0;

  for (let layer = 0; layer < LAYER_COUNT; layer++) {
    const count = layerSizes[layer]!;
    const layerNodes: MapNode[] = [];

    for (let col = 0; col < count; col++) {
      let type: MapNodeType;
      if (layer === 0) {
        type = "enemy";
      } else if (layer === LAYER_COUNT - 1) {
        type = "boss";
      } else {
        type = pickTypeForLayer(layer);
      }

      const node: MapNode = {
        id: `node_${nodeIndex++}`,
        layer,
        column: col,
        type,
        x: 0,
        y: 0,
        connections: [],
      };
      layerNodes.push(node);
      allNodes.push(node);
    }
    nodesByLayer.push(layerNodes);
  }

  buildConnections(nodesByLayer);
  assignPositions(nodesByLayer, layerSizes);
  ensureMapVariety(allNodes);

  return {
    nodes: allNodes,
    layers: LAYER_COUNT,
    startNodeId: nodesByLayer[0]![0]!.id,
    bossNodeId: nodesByLayer[LAYER_COUNT - 1]![0]!.id,
  };
}

export function getMapDimensions(map: MapData): { width: number; height: number } {
  const maxX = Math.max(...map.nodes.map((n) => n.x));
  const maxY = Math.max(...map.nodes.map((n) => n.y));
  return {
    width: maxX + MAP_PADDING_X + NODE_RADIUS * 2,
    height: maxY + MAP_PADDING_Y + NODE_RADIUS * 2,
  };
}

export { NODE_RADIUS };
