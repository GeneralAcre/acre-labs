// Helpers for creator-chosen ID card template colors.

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value);
}

// Near-black or white, whichever reads better on the given background
// (WCAG relative luminance), so any color a creator picks stays legible.
export function readableTextOn(hex: string): string {
  if (!isHexColor(hex)) return "#111111";
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#111111" : "#ffffff";
}

export const DEFAULT_CARD_COLOR = "#ffffff";
export const DEFAULT_ACCENT_COLOR = "#e0101e";
