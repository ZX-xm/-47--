import { createCardFromTemplate } from "../core/DeckBuilder";
import { HIVE_FACTION_CARD_POOL } from "./cards";
import {
  COMMON_CONSUMABLE_IDS,
  CONSUMABLE_DEFS,
  RARE_CONSUMABLE_IDS,
} from "./consumables";
import type { ConsumableId } from "../types/consumable";
import type {
  DoctorServiceOffer,
  MarketShopState,
  TrainerCardOffer,
} from "../types/shop";

export const DOCTOR_SERVICES: DoctorServiceOffer[] = [
  {
    id: "light_wound",
    name: "轻伤处理",
    price: 10,
    currency: "credits",
    description: "回复 10 点生命值",
  },
  {
    id: "heavy_wound",
    name: "重伤救治",
    price: 25,
    currency: "credits",
    description: "回复 25 点生命值",
  },
  {
    id: "full_recovery",
    name: "完全康复",
    price: 50,
    currency: "credits",
    description: "生命值回满",
  },
  {
    id: "body_enhance",
    name: "体质强化（永久）",
    price: 30,
    currency: "contribution",
    description: "最大生命值 +5（可重复购买，价格不变）",
  },
];

export const MARKET_COMMON_CARD_POOL = [
  "empire_pulse_pistol",
  "standard_body_armor",
  "first_aid_syringe",
  "tactical_mark",
];

export const MARKET_UNCOMMON_CARD_POOL = [
  "fragmentation_grenade",
  "empire_shield_generator",
  "adrenaline",
  "execute_order",
];

export const MARKET_RARE_CARD_POOL = [
  "empire_mech_pack",
  "gene_enhancement_needle",
  "tactical_retreat",
];

const INITIAL_CARD_IDS = new Set([
  "strike",
  "defend",
  "leap_strike",
  "counter",
  "swift_defend",
  "follow_up_strike",
]);

function pickUnique(pool: string[], count: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function pickHivePool(count: number): string[] {
  const pool = HIVE_FACTION_CARD_POOL.filter((id) => !INITIAL_CARD_IDS.has(id));
  return pickUnique(pool.length > 0 ? pool : HIVE_FACTION_CARD_POOL, count);
}

function pickConsumables(count: number): ConsumableId[] {
  return pickUnique(COMMON_CONSUMABLE_IDS, count) as ConsumableId[];
}

function pickRareConsumable(): ConsumableId {
  const idx = Math.floor(Math.random() * RARE_CONSUMABLE_IDS.length);
  return RARE_CONSUMABLE_IDS[idx] ?? "regeneration_serum";
}

export function generateMarketShop(nodeId: string): MarketShopState {
  const commonIds = pickUnique(MARKET_COMMON_CARD_POOL, 3);
  const uncommonIds = pickUnique(MARKET_UNCOMMON_CARD_POOL, 2);
  const rareId =
    MARKET_RARE_CARD_POOL[
      Math.floor(Math.random() * MARKET_RARE_CARD_POOL.length)
    ]!;
  const hiveIds = pickHivePool(3);

  const trainerOffers: TrainerCardOffer[] = [
    ...commonIds.map((templateId) => ({
      pool: "common" as const,
      templateId,
      price: 15,
      card: createCardFromTemplate(templateId),
    })),
    ...uncommonIds.map((templateId) => ({
      pool: "uncommon" as const,
      templateId,
      price: 30,
      card: createCardFromTemplate(templateId),
    })),
    {
      pool: "rare",
      templateId: rareId,
      price: 60,
      card: createCardFromTemplate(rareId),
    },
    ...hiveIds.map((templateId) => ({
      pool: "hive" as const,
      templateId,
      price: 40,
      requiresContribution: 20,
      card: createCardFromTemplate(templateId),
    })),
  ];

  const dealerCommon = pickConsumables(5).map((id) => ({
    id,
    price: CONSUMABLE_DEFS[id].price,
  }));

  const rareId2 = pickRareConsumable();
  const dealerRare = {
    id: rareId2,
    price: CONSUMABLE_DEFS[rareId2].price,
  };

  return {
    nodeId,
    doctorServices: DOCTOR_SERVICES,
    trainerOffers,
    dealerCommon,
    dealerRare,
  };
}

export function getDoctorServiceHeal(
  serviceId: DoctorServiceOffer["id"],
  playerHp: number,
  playerMaxHp: number
): { hp: number; maxHp?: number } {
  switch (serviceId) {
    case "light_wound":
      return { hp: Math.min(playerMaxHp, playerHp + 10) };
    case "heavy_wound":
      return { hp: Math.min(playerMaxHp, playerHp + 25) };
    case "full_recovery":
      return { hp: playerMaxHp };
    case "body_enhance":
      return {
        hp: Math.min(playerMaxHp + 5, playerHp + 5),
        maxHp: playerMaxHp + 5,
      };
  }
}
