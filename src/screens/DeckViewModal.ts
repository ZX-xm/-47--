import type { CardInstance } from "../types/card";
import { countCardsInDeck } from "../core/DeckBuilder";
import { el } from "../utils/dom";

const TYPE_LABELS: Record<string, string> = {
  attack: "攻击",
  skill: "技能",
  power: "能力",
};

function renderDeckCard(card: CardInstance, count: number): HTMLDivElement {
  const cardEl = el("div", { className: "deck-view-card" });
  cardEl.appendChild(el("div", { className: "deck-view-card-header" }));
  const header = cardEl.querySelector(".deck-view-card-header")!;
  header.appendChild(el("span", { className: "battle-card-cost" }, String(card.cost)));
  header.appendChild(el("span", { className: "deck-view-card-type" }, TYPE_LABELS[card.type] ?? card.type));
  if (count > 1) {
    header.appendChild(el("span", { className: "deck-view-card-count" }, `×${count}`));
  }
  cardEl.appendChild(el("div", { className: "battle-card-name" }, card.name));
  cardEl.appendChild(el("div", { className: "battle-card-desc" }, card.description));
  return cardEl;
}

export function showDeckViewModal(deck: CardInstance[], onClose: () => void): void {
  const existing = document.getElementById("deck-view-modal");
  existing?.remove();

  const overlay = el("div", { className: "modal-overlay", id: "deck-view-modal" });
  const panel = el("div", { className: "modal-panel deck-view-panel" });

  panel.appendChild(el("h2", { className: "modal-title" }, "卡组信息"));
  panel.appendChild(
    el("p", { className: "modal-subtitle" }, `共 ${deck.length} 张卡牌`)
  );

  const counts = countCardsInDeck(deck);
  const uniqueCards = new Map<string, CardInstance>();
  for (const card of deck) {
    if (!uniqueCards.has(card.templateId)) {
      uniqueCards.set(card.templateId, card);
    }
  }

  const grid = el("div", { className: "deck-view-grid" });
  for (const card of uniqueCards.values()) {
    grid.appendChild(renderDeckCard(card, counts.get(card.templateId) ?? 1));
  }
  panel.appendChild(grid);

  const closeBtn = el("button", { className: "btn" }, "关闭");
  closeBtn.addEventListener("click", () => {
    overlay.remove();
    onClose();
  });
  panel.appendChild(closeBtn);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
      onClose();
    }
  });

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}
