export type FactionId =
  | "hive"
  | "mech"
  | "federation"
  | "empire"
  | "calamity"
  | "matrix";

export type Difficulty = "easy" | "normal" | "hard" | "impossible";

export type GamePhase =
  | "faction_select"
  | "character_select"
  | "target_faction_select"
  | "mission_select"
  | "map"
  | "combat"
  | "reward"
  | "shop"
  | "faction_shop"
  | "event"
  | "combat_preview"
  | "game_over";

export interface Character {
  id: string;
  name: string;
  description: string;
  energy: number;
  maxHp: number;
}

export interface Faction {
  id: FactionId;
  name: string;
  icon: string;
  description: string;
  characters: Character[];
}

export interface Mission {
  id: string;
  name: string;
  targetFaction: FactionId;
  difficulty: Difficulty;
  description: string;
}

export interface GameStateData {
  phase: GamePhase;
  faction: Faction | null;
  character: Character | null;
  targetFaction: Faction | null;
  mission: Mission | null;
  deck: import("./card").CardInstance[];
  map: import("./map").MapData | null;
  playerHp: number;
  playerMaxHp: number;
  /** 联邦币（原金币） */
  federationCredits: number;
  /** 跨节点保留的基因物质（事件消耗等） */
  geneMaterial: number;
  factionContribution: number;
  /** 角色特质 */
  traits: string[];
  /** 特殊物品 */
  specialItems: string[];
  /** @deprecated 使用 traits */
  relics: string[];
  currentNodeId: string | null;
  clearedNodeIds: string[];
  /** 节点 id -> 事件 id */
  nodeEvents: Record<string, string>;
  event: import("./event").EventSession | null;
  /** 边境巡逻路线图剩余预览次数 */
  patrolPreviewRemaining: number;
  /** 战斗预览（迎战/躲避） */
  combatPreview: {
    nodeId: string;
    encounterId: string;
    encounterName: string;
    encounterDescription: string;
  } | null;
  /** 事件节点 id，战斗结束后回到事件结果 */
  eventCombatReturnNodeId: string | null;
  combat: import("./combat").CombatState | null;
  reward: import("./combat").RewardState | null;
  /** 黑市综合商店 */
  marketShop: import("./shop").MarketShopState | null;
  /** 消耗品栏（最多 4 格） */
  consumables: import("./consumable").OwnedConsumable[];
  /** 阵营贡献商店 */
  shop: import("./shop").FactionShopState | null;
  gameOverReason: "boss" | "defeat" | null;
  mapToast: string | null;
  /** 全屏加载提示（生成地图等） */
  loadingOverlay: string | null;
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "简单",
  normal: "普通",
  hard: "困难",
  impossible: "不可能",
};

export const PHASE_LABELS: Partial<Record<GamePhase, string>> = {
  faction_select: "选择阵营",
  character_select: "选择角色",
  target_faction_select: "选择任务阵营",
  mission_select: "选择任务",
  map: "探索地图",
  combat: "战斗",
  reward: "战斗奖励",
  shop: "黑市商店",
  faction_shop: "阵营商店",
  event: "事件",
  combat_preview: "遭遇预览",
  game_over: "游戏结束",
};
