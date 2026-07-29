"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  // window.location.origin only changes via full navigation, which already
  // remounts the app — no event to subscribe to.
  return () => {};
}

function getSnapshot() {
  return window.location.origin;
}

function getServerSnapshot() {
  return "";
}

// Reads window.location.origin without an effect+setState round-trip (which
// the purity rule flags as a synchronous setState-in-effect) — this is the
// pattern React recommends for external browser state that must render ""
// on the server without a hydration mismatch.
export function useOrigin(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
