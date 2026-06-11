import { gameState } from "../core/GameState";
import { CONSUMABLE_DEFS } from "../data/consumables";
import { CARD_TEMPLATES } from "../data/cards";
import { MAX_CONSUMABLE_SLOTS } from "../types/consumable";
import { createScreenHeader, el } from "../utils/dom";

function attachTooltip(element: HTMLElement, text: string): void {
  element.classList.add("has-status-tooltip");
  element.setAttribute("data-tooltip", text);
}

function renderCardOffer(
  templateId: string,
  price: number,
  label: string,
  canBuy: boolean,
  onBuy: () => void
): HTMLDivElement {
  const template = CARD_TEMPLATES[templateId];
  const card = el(
    "div",
    {
      className: `shop-card battle-card--${template?.type ?? "skill"}${
        canBuy ? "" : " shop-card-disabled"
      }`,
    },
    ""
  );
  if (template) {
    attachTooltip(card, template.description);
    card.appendChild(el("div", { className: "battle-card-cost" }, String(template.cost)));
    card.appendChild(el("div", { className: "battle-card-name" }, template.name));
    card.appendChild(el("div", { className: "battle-card-desc" }, template.description));
  }
  const header = el("div", { className: "shop-card-header" });
  header.appendChild(
    el("span", { className: "shop-card-price stat-federation-credits" }, `💎 ${price}`)
  );
  header.appendChild(el("span", { className: "shop-pool-tag" }, label));
  card.prepend(header);
  if (canBuy) {
    card.addEventListener("click", onBuy);
  }
  return card;
}

export function renderMarketShopScreen(container: HTMLElement): void {
  const state = gameState.getState();
  const market = state.marketShop;
  if (!market) return;

  const screen = el("div", { className: "screen shop-screen market-shop-screen" });

  const statusBar = el("div", { className: "map-status-bar" });
  statusBar.appendChild(
    el("span", {}, `❤ ${state.playerHp}/${state.playerMaxHp}`)
  );
  statusBar.appendChild(
    el("span", { className: "stat-federation-credits" }, `💎 ${state.federationCredits}`)
  );
  statusBar.appendChild(el("span", {}, `⚑ ${state.factionContribution}`));
  statusBar.appendChild(
    el("span", {}, `消耗品 ${state.consumables.length}/${MAX_CONSUMABLE_SLOTS}`)
  );
  screen.appendChild(statusBar);

  screen.appendChild(
    createScreenHeader("黑市商店", "黑市医师 · 技能训练师 · 贩子 — 各取所需")
  );

  const grid = el("div", { className: "market-shop-grid" });

  const doctorSection = el("section", { className: "market-shop-section" });
  doctorSection.appendChild(el("h3", { className: "market-section-title" }, "黑市医师"));
  doctorSection.appendChild(
    el("p", { className: "market-section-quote" }, "受伤了？联邦币或贡献点，我都能治。")
  );
  const doctorList = el("div", { className: "market-service-list" });
  for (const service of market.doctorServices) {
    const canBuy =
      service.currency === "credits"
        ? state.federationCredits >= service.price
        : state.factionContribution >= service.price;
    const row = el("div", { className: "market-service-row" });
    attachTooltip(row, service.description);
    row.appendChild(el("span", { className: "market-service-name" }, service.name));
    row.appendChild(
      el(
        "span",
        { className: "market-service-price" },
        service.currency === "credits"
          ? `💎 ${service.price}`
          : `⚑ ${service.price}`
      )
    );
    const btn = el(
      "button",
      { className: `btn btn-small${canBuy ? "" : " btn-disabled"}` },
      "购买"
    );
    if (canBuy) {
      btn.addEventListener("click", () => gameState.buyDoctorService(service.id));
    }
    row.appendChild(btn);
    doctorList.appendChild(row);
  }
  doctorSection.appendChild(doctorList);
  grid.appendChild(doctorSection);

  const trainerSection = el("section", { className: "market-shop-section" });
  trainerSection.appendChild(el("h3", { className: "market-section-title" }, "技能训练师"));
  trainerSection.appendChild(
    el("p", { className: "market-section-quote" }, "想学帝国人的招数？还是强化你的本能？联邦币就行。")
  );
  const trainerGrid = el("div", { className: "shop-grid" });
  const poolLabels: Record<string, string> = {
    common: "普通",
    uncommon: "罕见",
    rare: "稀有",
    hive: "蜂巢",
  };
  for (const offer of market.trainerOffers) {
    const canBuy =
      state.federationCredits >= offer.price &&
      (offer.requiresContribution === undefined ||
        state.factionContribution >= offer.requiresContribution);
    trainerGrid.appendChild(
      renderCardOffer(
        offer.templateId,
        offer.price,
        poolLabels[offer.pool] ?? offer.pool,
        canBuy,
        () => gameState.buyTrainerCard(offer.templateId)
      )
    );
  }
  trainerSection.appendChild(trainerGrid);
  grid.appendChild(trainerSection);

  const dealerSection = el("section", { className: "market-shop-section" });
  dealerSection.appendChild(el("h3", { className: "market-section-title" }, "贩子"));
  dealerSection.appendChild(
    el(
      "p",
      { className: "market-section-quote" },
      "义体、药物、黑客工具……只要给钱，什么都能搞到。"
    )
  );
  const dealerGrid = el("div", { className: "market-consumable-grid" });
  const allOffers = [...market.dealerCommon, ...(market.dealerRare ? [market.dealerRare] : [])];
  for (const offer of allOffers) {
    const def = CONSUMABLE_DEFS[offer.id];
    const slotsFull = state.consumables.length >= MAX_CONSUMABLE_SLOTS;
    const canBuy = !slotsFull && state.federationCredits >= offer.price;
    const item = el(
      "div",
      {
        className: `market-consumable-item${
          canBuy ? "" : " shop-card-disabled"
        }${market.dealerRare?.id === offer.id ? " market-consumable-rare" : ""}`,
      },
      ""
    );
    attachTooltip(item, def.description);
    item.appendChild(el("div", { className: "market-consumable-name" }, def.name));
    item.appendChild(
      el("div", { className: "market-consumable-desc" }, def.description)
    );
    item.appendChild(
      el(
        "div",
        { className: "market-consumable-price stat-federation-credits" },
        `💎 ${offer.price}`
      )
    );
    if (canBuy) {
      item.addEventListener("click", () => gameState.buyMarketConsumable(offer.id));
    }
    dealerGrid.appendChild(item);
  }
  dealerSection.appendChild(dealerGrid);

  const ownedRow = el("div", { className: "market-owned-consumables" });
  ownedRow.appendChild(el("span", {}, "已携带："));
  if (state.consumables.length === 0) {
    ownedRow.appendChild(el("span", { className: "market-empty-slots" }, "无"));
  } else {
    for (const slot of state.consumables) {
      const def = CONSUMABLE_DEFS[slot.id];
      const tag = el("span", { className: "market-owned-tag" }, def.name);
      attachTooltip(tag, def.description);
      ownedRow.appendChild(tag);
    }
  }
  dealerSection.appendChild(ownedRow);
  grid.appendChild(dealerSection);

  screen.appendChild(grid);

  const actions = el("div", { className: "shop-actions" });
  const leaveBtn = el("button", { className: "btn btn-secondary" }, "离开商店");
  leaveBtn.addEventListener("click", () => gameState.leaveMarketShop());
  actions.appendChild(leaveBtn);
  screen.appendChild(actions);

  container.appendChild(screen);
}
