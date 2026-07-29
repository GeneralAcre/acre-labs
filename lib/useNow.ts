"use client";

import { useState } from "react";

// Date.now() can't be called directly in a component body (it's impure —
// React requires components to be idempotent) or synchronously inside an
// effect (flagged as a cascading-render risk). useState's lazy initializer is
// the sanctioned escape hatch for one-time impure reads: it runs once per
// mount rather than on every render. Returns null on the very first
// server-rendered pass, so callers should treat "unknown" as "not yet closed"
// rather than flashing a wrong state before mount.
export function useNow(): number | null {
  const [now] = useState<number | null>(() =>
    typeof window === "undefined" ? null : Date.now()
  );
  return now;
}
