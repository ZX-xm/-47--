import { TRAIT_DESCRIPTIONS, TRAIT_LABELS } from "../data/traits";
import {
  SPECIAL_ITEM_DESCRIPTIONS,
  SPECIAL_ITEM_LABELS,
} from "../data/specialItems";
import type { SpecialItemId } from "../types/specialItem";
import { el } from "../utils/dom";

export function showTraitsModal(
  traits: string[],
  specialItems: string[]
): void {
  const overlay = el("div", { className: "modal-overlay traits-modal-overlay" });
  const panel = el("div", { className: "modal-panel traits-modal" });

  panel.appendChild(el("h2", { className: "modal-title" }, "特质 / 特殊物品"));

  if (traits.length > 0) {
    panel.appendChild(el("h3", { className: "traits-section-title" }, "特质"));
    const list = el("div", { className: "traits-list" });
    for (const id of traits) {
      const item = el("div", { className: "trait-item" });
      item.appendChild(el("strong", {}, TRAIT_LABELS[id as keyof typeof TRAIT_LABELS] ?? id));
      item.appendChild(
        el(
          "p",
          {},
          TRAIT_DESCRIPTIONS[id as keyof typeof TRAIT_DESCRIPTIONS] ?? ""
        )
      );
      list.appendChild(item);
    }
    panel.appendChild(list);
  }

  if (specialItems.length > 0) {
    panel.appendChild(el("h3", { className: "traits-section-title" }, "特殊物品"));
    const list = el("div", { className: "traits-list" });
    for (const id of specialItems) {
      const sid = id as SpecialItemId;
      const item = el("div", { className: "trait-item trait-item-special" });
      item.appendChild(el("strong", {}, SPECIAL_ITEM_LABELS[sid] ?? id));
      item.appendChild(el("p", {}, SPECIAL_ITEM_DESCRIPTIONS[sid] ?? ""));
      list.appendChild(item);
    }
    panel.appendChild(list);
  }

  if (traits.length === 0 && specialItems.length === 0) {
    panel.appendChild(el("p", { className: "traits-empty" }, "暂无特质或特殊物品"));
  }

  const closeBtn = el("button", { className: "btn" }, "关闭");
  closeBtn.addEventListener("click", () => overlay.remove());
  panel.appendChild(closeBtn);
  overlay.appendChild(panel);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

export function createTraitsButton(
  traits: string[],
  specialItems: string[]
): HTMLButtonElement {
  const btn = el("button", { className: "traits-view-btn" }, "特质 / 特殊物品");
  btn.addEventListener("click", () => showTraitsModal(traits, specialItems));
  return btn;
}
