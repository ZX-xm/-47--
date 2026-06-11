import type { FactionId } from "../types/game";
import type { FactionShopEntry } from "../types/shop";
import { CARD_TEMPLATES } from "./cards";
import { HIVE_FACTION_CARD_POOL } from "./cards";
import { createCardFromTemplate } from "../core/DeckBuilder";
import type { ShopOffer } from "../types/shop";

function poolToShopEntries(templateIds: string[]): FactionShopEntry[] {
  return templateIds
    .filter((id) => CARD_TEMPLATES[id]?.shopPrice !== undefined)
    .map((templateId) => ({
      templateId,
      price: CARD_TEMPLATES[templateId]!.shopPrice!,
    }));
}

export const HIVE_FACTION_SHOP: FactionShopEntry[] =
  poolToShopEntries(HIVE_FACTION_CARD_POOL);

export const FACTION_SHOP_CATALOG: Partial<Record<FactionId, FactionShopEntry[]>> = {
  hive: HIVE_FACTION_SHOP,
};

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function generateShopOffers(
  factionId: FactionId,
  count = 6
): ShopOffer[] {
  const catalog = FACTION_SHOP_CATALOG[factionId] ?? HIVE_FACTION_SHOP;
  const picked = shuffle(catalog).slice(0, Math.min(count, catalog.length));

  return picked.map((entry) => ({
    templateId: entry.templateId,
    price: entry.price,
    card: createCardFromTemplate(entry.templateId),
  }));
}

export function getDefaultShopPrice(templateId: string): number {
  const template = CARD_TEMPLATES[templateId];
  return template?.shopPrice ?? 5;
}
