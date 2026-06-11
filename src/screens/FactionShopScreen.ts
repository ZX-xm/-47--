import { gameState } from "../core/GameState";
import { createScreenHeader, el } from "../utils/dom";

function renderShopCard(
  name: string,
  cost: number,
  price: number,
  description: string,
  canBuy: boolean,
  onBuy: () => void
): HTMLDivElement {
  const card = el("div", {
    className: canBuy ? "shop-card" : "shop-card shop-card-disabled",
  });

  card.appendChild(el("div", { className: "battle-card-cost" }, String(cost)));
  const header = el("div", { className: "shop-card-header" });
  header.appendChild(el("span", { className: "shop-card-price" }, `⚑ ${price}`));
  card.appendChild(header);
  card.appendChild(el("div", { className: "battle-card-name" }, name));
  card.appendChild(el("div", { className: "battle-card-desc" }, description));

  if (canBuy) {
    card.addEventListener("click", onBuy);
  }

  return card;
}

export function renderFactionShopScreen(container: HTMLElement): void {
  const state = gameState.getState();
  const shop = state.shop;
  if (!shop) return;

  const screen = el("div", { className: "screen shop-screen" });

  screen.appendChild(
    createScreenHeader(
      "阵营商店",
      `蜂巢特色牌 · 当前阵营贡献 ${state.factionContribution}`
    )
  );

  const grid = el("div", { className: "shop-grid" });

  for (const offer of shop.offers) {
    grid.appendChild(
      renderShopCard(
        offer.card.name,
        offer.card.cost,
        offer.price,
        offer.card.description,
        state.factionContribution >= offer.price,
        () => gameState.buyShopCard(offer.templateId)
      )
    );
  }

  screen.appendChild(grid);

  const actions = el("div", { className: "shop-actions" });
  const leaveBtn = el("button", { className: "btn" }, "离开商店");
  leaveBtn.addEventListener("click", () => gameState.leaveShop());
  actions.appendChild(leaveBtn);
  screen.appendChild(actions);

  container.appendChild(screen);
}
