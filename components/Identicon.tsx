// Deterministic, wallet-derived avatar — no profile photos in this app (it's
// wallet-only identity, "no forms, no middlemen"), so the passport card needs
// a stand-in that's still unique and stable per address.
function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function cellFilled(seed: number, index: number): boolean {
  const mixed = Math.imul(seed ^ Math.imul(index + 1, 2654435761), 2246822519) >>> 0;
  return ((mixed >>> 15) & 1) === 1;
}

const ROWS = 5;
// Only the left half (plus center column) is randomized; the right half
// mirrors it, matching the symmetric-glyph look of a woodcut seal.
const UNIQUE_COLS = 3;

export function Identicon({
  address,
  size = 64,
  className = "",
}: {
  address: string;
  size?: number;
  className?: string;
}) {
  const seed = hashSeed(address.toLowerCase());
  const cells: Array<[number, number]> = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < UNIQUE_COLS; col++) {
      if (!cellFilled(seed, row * UNIQUE_COLS + col)) continue;
      cells.push([col, row]);
      const mirrorCol = ROWS - 1 - col;
      if (mirrorCol !== col) cells.push([mirrorCol, row]);
    }
  }

  // Explicit pixel dimensions rather than h-full/w-full: inside a
  // `flex items-center justify-center` parent, a flex item's default
  // align-self is the container's `center` (not `stretch`), so a
  // percentage-sized, intrinsically-sizeless <svg> resolves to 0x0.
  const innerSize = Math.round(size * 0.72);

  return (
    <div
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-full border border-brand-ink/10 bg-brand-ink/5 ${className}`}
    >
      <svg
        viewBox={`0 0 ${ROWS} ${ROWS}`}
        width={innerSize}
        height={innerSize}
        shapeRendering="crispEdges"
      >
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} className="fill-brand-ink" />
        ))}
      </svg>
    </div>
  );
}
