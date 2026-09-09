"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Renders client-side only — the verify URL depends on window.location.origin
// (see useOrigin), so there's nothing meaningful to encode during SSR anyway.
export function PassportQr({
  value,
  size = 72,
  className = "",
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  // Keyed by the (value, size) it was generated for, so a still-in-flight
  // result from a previous `value` never renders as if it belonged to the
  // current one — the derived `dataUrl` below just falls back to the loading
  // placeholder until a matching result lands, no extra setState-on-mount needed.
  const [result, setResult] = useState<{ value: string; size: number; dataUrl: string } | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(value, {
      // Render at 3x and let CSS scale it down for a crisp result on retina
      // screens, same idea as generating a larger raster than the display size.
      width: size * 3,
      margin: 0,
      color: { dark: "#1c1c1c", light: "#00000000" },
    })
      .then((url) => {
        if (!cancelled) setResult({ value, size, dataUrl: url });
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  const dataUrl = result && result.value === value && result.size === size ? result.dataUrl : null;

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`animate-pulse rounded-md bg-brand-ink/10 ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- data: URI, not an optimizable remote image
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt="Scan to verify this pass"
      className={className}
    />
  );
}
