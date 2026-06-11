import { createCardFromTemplate } from "../core/DeckBuilder";
import type { CardInstance } from "../types/card";
import { CARD_TEMPLATES, HIVE_FACTION_CARD_POOL } from "./cards";
import type { EventResolution, EventTemplate } from "../types/event";
import type { SpecialItemId } from "../types/specialItem";

const FEDERATION_CYBERNETIC_WEIGHTS: { id: string; weight: number }[] = [
  { id: "cyber_blade_claw", weight: 25 },
  { id: "cyber_muscle_fiber", weight: 25 },
  { id: "cyber_flame_hand", weight: 20 },
  { id: "cyber_glide_wing", weight: 8 },
  { id: "cyber_second_heart", weight: 3 },
];

const EMPIRE_EVENT_CARDS = ["empire_pulse_pistol", "empire_service_rifle"];

const HIVE_REWARD_POOL = HIVE_FACTION_CARD_POOL.filter(
  (id) => CARD_TEMPLATES[id]?.shopPrice !== undefined
);

export const EVENT_TEMPLATES: Record<string, EventTemplate> = {
  deserter_soldier: {
    id: "deserter_soldier",
    title: "叛逃士兵",
    intro:
      "你遇到了一名准备从帝国叛逃到联邦的植入义体士兵，他神色慌张，似乎正在躲避追兵。",
    choices: [
      { id: "kill", label: "杀死他，夺取资源" },
      { id: "help", label: "帮他摆脱追兵" },
      { id: "leave", label: "什么都不做，悄悄离开" },
    ],
  },
  abandoned_outpost: {
    id: "abandoned_outpost",
    title: "废弃哨站",
    intro: "你发现一座被摧毁的帝国边境哨站，残骸中仍有部分设备在运转。",
    choices: [
      { id: "armory", label: "搜索军械箱" },
      { id: "terminal", label: "破解通讯终端" },
      { id: "trap", label: "设置陷阱伏击" },
    ],
  },
  empire_interrogation: {
    id: "empire_interrogation",
    title: "帝国审讯现场",
    intro:
      "几名帝国士兵正在盘问一名疑似蜂巢间谍的平民，平民遍体鳞伤。",
    choices: [
      { id: "rescue", label: "出手解救平民" },
      { id: "sneak", label: "暗中击晕士兵，救走平民", geneCost: 1 },
      { id: "ignore", label: "袖手旁观" },
    ],
  },
  mutant_beasts: {
    id: "mutant_beasts",
    title: "野生变异生物",
    intro:
      "一群因帝国基因实验泄漏而变异的巨大甲虫挡住了去路，它们攻击一切活物。",
    choices: [
      { id: "fight", label: "强行突破" },
      { id: "lure", label: "用基因物质引诱它们离开", geneCost: 5 },
      { id: "detour", label: "绕远路" },
    ],
  },
  hive_outpost: {
    id: "hive_outpost",
    title: "蜂巢前哨联络点",
    intro: "一处隐蔽的蜂巢联络站，里面有一名情报官和一台物资终端。",
    choices: [
      { id: "supply", label: "领取任务补给" },
      { id: "intel", label: "上缴收集的情报", contributionCost: 20 },
    ],
  },
  bio_sample_leak: {
    id: "bio_sample_leak",
    title: "生物样本泄露",
    intro:
      "一片枯萎的林地中散落着破碎的蜂巢运输舱，绿色的基因物质泄漏形成小水洼。",
    choices: [
      { id: "investigate", label: "调查坠毁原因" },
      { id: "report", label: "标记位置通知蜂巢" },
    ],
  },
};

const EVENT_POOL = Object.keys(EVENT_TEMPLATES);

export function pickRandomEventId(): string {
  return EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]!;
}

function pickWeightedCybernetic(): string {
  const total = FEDERATION_CYBERNETIC_WEIGHTS.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of FEDERATION_CYBERNETIC_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return FEDERATION_CYBERNETIC_WEIGHTS[0]!.id;
}

export function pickRandomHiveCard(): CardInstance {
  const pool =
    HIVE_REWARD_POOL.length > 0 ? HIVE_REWARD_POOL : ["gene_recycle"];
  const id = pool[Math.floor(Math.random() * pool.length)]!;
  return createCardFromTemplate(id);
}

export function pickRandomFederationCybernetic(): CardInstance {
  return createCardFromTemplate(pickWeightedCybernetic());
}

export function pickRandomEmpireEventCard(): CardInstance {
  const id =
    EMPIRE_EVENT_CARDS[Math.floor(Math.random() * EMPIRE_EVENT_CARDS.length)]!;
  return createCardFromTemplate(id);
}

export interface EventResolveContext {
  geneMaterial: number;
  factionContribution: number;
  playerHp: number;
}

export function canSelectEventChoice(
  choice: { geneCost?: number; contributionCost?: number },
  ctx: EventResolveContext
): boolean {
  if (choice.geneCost !== undefined && ctx.geneMaterial < choice.geneCost) {
    return false;
  }
  if (
    choice.contributionCost !== undefined &&
    ctx.factionContribution < choice.contributionCost
  ) {
    return false;
  }
  return true;
}

export function resolveEventChoice(
  eventId: string,
  choiceId: string
): EventResolution {
  switch (eventId) {
    case "deserter_soldier":
      if (choiceId === "kill") {
        return {
          narrative:
            "你终结了叛逃者的行踪，搜刮了义体组件与资源。",
          federationCredits: 10,
          factionContribution: 25,
          randomFederationCybernetic: true,
        };
      }
      if (choiceId === "help") {
        return {
          narrative: "追兵赶到，你们被迫背水一战。",
          combatEncounterId: "event_deserter_pursuit",
          postCombatCredits: 10,
          postCombatSpecialItemId: "empire_mech_intel",
        };
      }
      return { narrative: "你悄然离去，未留下任何痕迹。" };

    case "abandoned_outpost":
      if (choiceId === "armory") {
        return {
          narrative: "军械箱中有一把手枪与一些联邦币。",
          federationCredits: 15,
          randomEmpireEventCard: true,
        };
      }
      if (choiceId === "terminal") {
        return {
          narrative: "终端数据已下载，巡逻路线清晰可见。",
          factionContribution: 20,
          specialItemId: "border_patrol_map",
        };
      }
      return {
        narrative: "你布置陷阱，一名哨兵踏入伏击圈。",
        combatEncounterId: "event_outpost_ambush",
        postCombatCredits: 10,
      };

    case "empire_interrogation":
      if (choiceId === "rescue") {
        return {
          narrative: "你与帝国哨兵正面交火，救下了平民。",
          combatEncounterId: "event_interrogation_rescue",
          postCombatSpecialItemId: "hive_communicator",
        };
      }
      if (choiceId === "sneak") {
        return {
          narrative: "你用基因干扰弹击晕士兵，带平民从侧翼撤离。",
          consumeGene: 1,
          federationCredits: 10,
          randomHiveCard: true,
        };
      }
      return { narrative: "你选择袖手旁观，审讯声渐渐远去。" };

    case "mutant_beasts":
      if (choiceId === "fight") {
        return {
          narrative: "变异甲虫蜂拥而上，你只能杀出一条血路。",
          combatEncounterId: "event_mutant_beetles",
          postCombatCredits: 10,
          postCombatSpecialItemId: "mutant_beetle_shell",
        };
      }
      if (choiceId === "lure") {
        return {
          narrative: "你抛洒基因诱饵，甲虫群转向追猎气味而去。",
          consumeGene: 5,
          factionContribution: 10,
        };
      }
      return {
        narrative: "你绕远路前行，体力在长途跋涉中消耗殆尽。",
        hpChange: -5,
      };

    case "hive_outpost":
      if (choiceId === "supply") {
        return {
          narrative: "联络官为你调拨了前线补给与一张蜂巢战术卡。",
          federationCredits: 20,
          randomHiveCard: true,
        };
      }
      return {
        narrative: "情报官收下了加密数据盘，并交给你一台分析仪。",
        consumeContribution: 20,
        specialItemId: "intel_analyzer",
      };

    case "bio_sample_leak":
      if (choiceId === "investigate") {
        return {
          narrative: "运输舱黑匣子显示这是一次人为破坏，你回收了残留样本。",
          factionContribution: 20,
          cardTemplateId: "gene_recycle",
        };
      }
      return {
        narrative: "你标记坐标后离开，蜂巢会派人回收样本。",
        factionContribution: 25,
      };

    default:
      return { narrative: "什么也没有发生。" };
  }
}

export function getEventTemplate(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES[id];
}

export function addSpecialItemIfNew(
  items: string[],
  id: SpecialItemId
): string[] {
  if (items.includes(id)) return items;
  return [...items, id];
}
