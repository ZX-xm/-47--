import type { CardInstance } from "./card";
import type { ConsumableId } from "./consumable";

export interface ShopOffer {
  templateId: string;
  price: number;
  card: CardInstance;
}

/** 阵营商店（贡献点购卡） */
export interface FactionShopState {
  nodeId: string;
  offers: ShopOffer[];
}

export type DoctorServiceId =
  | "light_wound"
  | "heavy_wound"
  | "full_recovery"
  | "body_enhance";

export interface DoctorServiceOffer {
  id: DoctorServiceId;
  name: string;
  price: number;
  currency: "credits" | "contribution";
  description: string;
}

export interface TrainerCardOffer {
  pool: "common" | "uncommon" | "rare" | "hive";
  templateId: string;
  price: number;
  card: CardInstance;
  requiresContribution?: number;
}

export interface DealerConsumableOffer {
  id: ConsumableId;
  price: number;
}

/** 黑市综合商店（三模块） */
export interface MarketShopState {
  nodeId: string;
  doctorServices: DoctorServiceOffer[];
  trainerOffers: TrainerCardOffer[];
  dealerCommon: DealerConsumableOffer[];
  dealerRare: DealerConsumableOffer | null;
}

export interface FactionShopEntry {
  templateId: string;
  price: number;
}

/** @deprecated 使用 FactionShopState 或 MarketShopState */
export type ShopState = FactionShopState;
