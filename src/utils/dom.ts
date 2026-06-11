export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "className") {
        element.className = value;
      } else {
        element.setAttribute(key, value);
      }
    }
  }
  for (const child of children) {
    if (typeof child === "string") {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }
  return element;
}

export function clearElement(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function createLockBadge(): HTMLSpanElement {
  return el("span", { className: "lock-badge" }, "🔒");
}

export function createScreenHeader(title: string, subtitle?: string): HTMLDivElement {
  const header = el("div", { className: "screen-header" });
  header.appendChild(el("h1", { className: "screen-title" }, title));
  if (subtitle) {
    header.appendChild(el("p", { className: "screen-subtitle" }, subtitle));
  }
  return header;
}

export function createBackButton(label: string, onClick: () => void): HTMLButtonElement {
  const btn = el("button", { className: "back-btn" }, label);
  btn.addEventListener("click", onClick);
  return btn;
}

export function createSelectCard(
  icon: string,
  name: string,
  desc: string,
  locked: boolean,
  onClick?: () => void,
  accentClass?: string
): HTMLDivElement {
  let className = locked ? "select-card locked" : "select-card";
  if (accentClass) className += ` ${accentClass}`;

  const card = el("div", { className });
  if (locked) {
    card.appendChild(createLockBadge());
  }
  card.appendChild(el("div", { className: "select-card-icon" }, icon));
  card.appendChild(el("div", { className: "select-card-name" }, name));
  card.appendChild(el("div", { className: "select-card-desc" }, desc));
  if (!locked && onClick) {
    card.addEventListener("click", onClick);
  }
  return card;
}
