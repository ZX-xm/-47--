export type MapNodeType =
  | "enemy"
  | "event"
  | "shop"
  | "elite"
  | "boss"
  | "faction_shop";

export interface MapNode {
  id: string;
  layer: number;
  column: number;
  type: MapNodeType;
  x: number;
  y: number;
  connections: string[];
}

export interface MapData {
  nodes: MapNode[];
  layers: number;
  startNodeId: string;
  bossNodeId: string;
}

export const NODE_TYPE_LABELS: Record<MapNodeType, string> = {
  enemy: "敌人",
  event: "随机事件",
  shop: "商店",
  elite: "精英",
  boss: "BOSS",
  faction_shop: "阵营商店",
};

export const NODE_TYPE_COLORS: Record<MapNodeType, string> = {
  enemy: "#c1121f",
  event: "#457b9d",
  shop: "#f4a261",
  elite: "#9b5de5",
  boss: "#e94560",
  faction_shop: "#2a9d8f",
};

export const NODE_TYPE_ICONS: Record<MapNodeType, string> = {
  enemy: "⚔",
  event: "?",
  shop: "$",
  elite: "★",
  boss: "☠",
  faction_shop: "⚑",
};
