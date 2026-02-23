import type { KeyboardEvent } from "react";
import type { ClipboardEvent } from "react";

const allowedKeys = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

export const blockNonNumericKey = (event: KeyboardEvent<HTMLInputElement>) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (allowedKeys.has(event.key)) return;
  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
};

export const blockNonNumericPaste = (event: ClipboardEvent<HTMLInputElement>) => {
  const text = event.clipboardData.getData("text");
  if (!/^\d+$/.test(text)) {
    event.preventDefault();
  }
};
