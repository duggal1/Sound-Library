export interface Keycap {
  readonly code: string;
  readonly label: string;
  readonly width: number;
}

function key(code: string, label: string, width = 1): Keycap {
  return { code, label, width };
}

export const KEY_ROWS = [
  [key("Escape", "Esc"), ...Array.from("1234567890", n => key("Digit" + n, n)), key("Minus", "−"), key("Equal", "="), key("Backspace", "Backspace", 2)],
  [key("Tab", "Tab", 1.5), ...Array.from("QWERTYUIOP", l => key("Key" + l, l)), key("BracketLeft", "["), key("BracketRight", "]"), key("Backslash", "\\", 1.5)],
  [key("CapsLock", "Caps", 1.75), ...Array.from("ASDFGHJKL", l => key("Key" + l, l)), key("Semicolon", ";"), key("Quote", "'"), key("Enter", "Enter", 2.25)],
  [key("ShiftLeft", "Shift", 2.25), ...Array.from("ZXCVBNM", l => key("Key" + l, l)), key("Comma", ","), key("Period", "."), key("Slash", "/"), key("ShiftRight", "Shift", 2.75)],
  [key("ControlLeft", "Ctrl", 1.25), key("MetaLeft", "⌘", 1.25), key("AltLeft", "Alt", 1.25), key("Space", "Space", 6.25), key("AltRight", "Alt", 1.25), key("MetaRight", "⌘", 1.25), key("ContextMenu", "Menu", 1.25), key("ControlRight", "Ctrl", 1.25)],
] as const;

export const KEY_CODES = new Set(KEY_ROWS.flat().map(keycap => keycap.code));

export function keySoundId(code: string): string {
  return "key-" + code.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase().replace(/^key-?/, "").replace(/^digit/, "");
}
