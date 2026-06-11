export type ConsumableId =
  | "gene_material_pack"
  | "nano_repair_patch"
  | "empire_stimulant"
  | "energy_injector"
  | "focus_chip"
  | "emergency_shield"
  | "neural_accelerant"
  | "hive_antidote"
  | "em_smoke_bomb"
  | "snare_mine"
  | "magnetic_grenade"
  | "regeneration_serum"
  | "gene_overload_needle"
  | "empire_battlefield_order"
  | "emergency_consciousness_upload"
  | "time_auction"
  | "reinforced_bone_firmware"
  | "unreliable_overclock"
  | "memory_copier";

export type ConsumableRarity = "common" | "rare";

export interface ConsumableDef {
  id: ConsumableId;
  name: string;
  price: number;
  rarity: ConsumableRarity;
  description: string;
  /** 不可主动使用（如紧急意识上传） */
  passive?: boolean;
}

export interface OwnedConsumable {
  id: ConsumableId;
}

export const MAX_CONSUMABLE_SLOTS = 4;
