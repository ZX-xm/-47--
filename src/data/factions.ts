import type { Faction } from "../types/game";

export const FACTIONS: Faction[] = [
  {
    id: "hive",
    name: "蜂巢",
    icon: "🐝",
    description: "集群意志，以数量与毒素制敌",
    characters: [
      { id: "drone", name: "雄峰", description: "蜂巢前锋，擅长突进与晕眩", energy: 3, maxHp: 81 },
      { id: "worker", name: "工蜂", description: "后勤单位，强化防御与资源", energy: 3, maxHp: 70 },
      { id: "queen", name: "蜂后", description: "蜂巢核心，召唤与增益", energy: 3, maxHp: 65 },
      { id: "stinger", name: "毒刺", description: "毒素专家，持续伤害", energy: 3, maxHp: 68 },
    ],
  },
  {
    id: "mech",
    name: "智械",
    icon: "🤖",
    description: "机械军团，精密计算与火力覆盖",
    characters: [
      { id: "tank", name: "重装机兵", description: "高护甲前线单位", energy: 3, maxHp: 70 },
      { id: "sniper", name: "狙击单元", description: "远程精准打击", energy: 3, maxHp: 70 },
      { id: "hacker", name: "入侵者", description: "干扰敌方系统", energy: 3, maxHp: 70 },
      { id: "core", name: "核心AI", description: "自适应战术核心", energy: 4, maxHp: 75 },
    ],
  },
  {
    id: "federation",
    name: "联邦",
    icon: "🛡",
    description: "联合力量，均衡发展与团队协作",
    characters: [
      { id: "soldier", name: "联邦士兵", description: "标准作战单位", energy: 3, maxHp: 70 },
      { id: "medic", name: "战地医护", description: "治疗与支援", energy: 3, maxHp: 70 },
      { id: "engineer", name: "工程技师", description: "部署防御设施", energy: 3, maxHp: 70 },
      { id: "commander", name: "指挥官", description: "战术调度核心", energy: 3, maxHp: 70 },
    ],
  },
  {
    id: "empire",
    name: "帝国",
    icon: "👑",
    description: "铁血秩序，压倒性军事力量",
    characters: [
      { id: "knight", name: "帝国骑士", description: "重装冲锋单位", energy: 3, maxHp: 70 },
      { id: "mage", name: "宫廷法师", description: "元素魔法攻击", energy: 3, maxHp: 70 },
      { id: "assassin", name: "暗影刺客", description: "暗杀与暴击", energy: 3, maxHp: 70 },
      { id: "general", name: "帝国将军", description: "全军指挥核心", energy: 4, maxHp: 75 },
    ],
  },
  {
    id: "calamity",
    name: "祸岛",
    icon: "☠",
    description: "灾厄之地，腐蚀与混沌的力量",
    characters: [
      { id: "mutant", name: "变异体", description: "不稳定的力量", energy: 3, maxHp: 70 },
      { id: "cultist", name: "邪教徒", description: "献祭换取力量", energy: 3, maxHp: 70 },
      { id: "beast", name: "灾兽", description: "原始狂暴", energy: 3, maxHp: 70 },
      { id: "prophet", name: "先知", description: "预见与诅咒", energy: 3, maxHp: 70 },
    ],
  },
  {
    id: "matrix",
    name: "矩阵",
    icon: "💠",
    description: "虚拟网络，数据操控与复制",
    characters: [
      { id: "agent", name: "代理程序", description: "系统执法者", energy: 3, maxHp: 70 },
      { id: "virus", name: "病毒体", description: "感染与扩散", energy: 3, maxHp: 70 },
      { id: "ghost", name: "幽灵码", description: "隐身与渗透", energy: 3, maxHp: 70 },
      { id: "architect", name: "架构师", description: "重构现实规则", energy: 4, maxHp: 75 },
    ],
  },
];

export function getFactionById(id: string): Faction | undefined {
  return FACTIONS.find((f) => f.id === id);
}
