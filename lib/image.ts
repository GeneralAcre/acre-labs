// Client-side image pipeline shared by badge art, community logos and member
// profile pictures. All of them are shown in square/circular frames and
// stored inline as data: URIs, so uploads are cropped square and downsized
// before they ever leave the browser.

const BADGE_MAX_DIMENSION = 512;
const BADGE_SOURCE_MAX_BYTES = 20 * 1024 * 1024; // guards against hanging on a huge decode
const BADGE_ALPHA_THRESHOLD = 16; // ignore near-invisible anti-aliased edge pixels when finding art bounds

// Many badge/sticker exports (POAP-style PNGs) sit on a transparent canvas
// that's noticeably larger than the circular artwork itself. Scans the pixel
// alpha channel to find the bounding box of the actual (non-transparent)
// artwork, so we can crop to that instead of the full transparent canvas.
function findOpaqueBounds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): { left: number; top: number; right: number; bottom: number } {
  const { data } = ctx.getImageData(0, 0, width, height);
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > BADGE_ALPHA_THRESHOLD) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  // Fully transparent image (nothing to trim) — fall back to the full canvas.
  if (right < left || bottom < top) {
    return { left: 0, top: 0, right: width - 1, bottom: height - 1 };
  }
  return { left, top, right, bottom };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Badge images are embedded directly in the on-chain metadata JSON that
// wallets fetch via tokenURI — an uncompressed phone photo (several MB) can
// be slow enough to fetch/render that some wallets time out and show the
// badge as blank. Resizing + re-encoding client-side keeps the payload small
// regardless of what the organizer uploads.
//
// The badge is always displayed in a circular 1:1 frame (see EventBadge), so
// this crops to a square around the actual artwork (trimming any transparent
// padding baked into the source file first — see findOpaqueBounds) and
// re-encodes as PNG. JPEG has no alpha channel, so any transparent pixels
// left in frame get flattened to opaque black on encode, which is what
// turned a slim transparent margin into a visible black ring inside the
// circular frame.
// Member card backgrounds: cropped (cover, centered) to the card's 1.55:1
// shape, downsized and re-encoded as JPEG to keep the data: URI small. Also
// returns the picture's average color, which the card uses as its tint and
// to pick readable text.
export const CARD_ASPECT = 1.55;
const CARD_BACKGROUND_WIDTH = 1240;

export async function compressCardBackground(file: File): Promise<{ dataUrl: string; averageColor: string }> {
  if (file.size > BADGE_SOURCE_MAX_BYTES) {
    throw new Error("Image is too large. Please choose a file under 20MB.");
  }
  const bitmap = await createImageBitmap(file);

  let sw = bitmap.width;
  let sh = bitmap.width / CARD_ASPECT;
  if (sh > bitmap.height) {
    sh = bitmap.height;
    sw = bitmap.height * CARD_ASPECT;
  }
  const sx = (bitmap.width - sw) / 2;
  const sy = (bitmap.height - sh) / 2;

  const width = Math.round(Math.min(sw, CARD_BACKGROUND_WIDTH));
  const height = Math.round(width / CARD_ASPECT);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Image compression isn't supported in this browser.");
  // JPEG has no alpha: flatten transparent pictures onto white, not black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  bitmap.close();

  const { data } = ctx.getImageData(0, 0, width, height);
  let r = 0;
  let g = 0;
  let b = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const hex = (sum: number) => Math.round(sum / pixels).toString(16).padStart(2, "0");

  return { dataUrl: canvas.toDataURL("image/jpeg", 0.82), averageColor: `#${hex(r)}${hex(g)}${hex(b)}` };
}

export async function compressSquareImage(file: File, maxDimension = BADGE_MAX_DIMENSION): Promise<string> {
  if (file.size > BADGE_SOURCE_MAX_BYTES) {
    throw new Error("Image is too large. Please choose a file under 20MB.");
  }

  const bitmap = await createImageBitmap(file);

  const probe = document.createElement("canvas");
  probe.width = bitmap.width;
  probe.height = bitmap.height;
  const probeCtx = probe.getContext("2d", { willReadFrequently: true });
  if (!probeCtx) throw new Error("Image compression isn't supported in this browser.");
  probeCtx.drawImage(bitmap, 0, 0);
  const bounds = findOpaqueBounds(probeCtx, bitmap.width, bitmap.height);

  const contentWidth = bounds.right - bounds.left + 1;
  const contentHeight = bounds.bottom - bounds.top + 1;
  const hasTransparentMargin =
    contentWidth < bitmap.width - 1 || contentHeight < bitmap.height - 1;

  let side: number;
  let sx: number;
  let sy: number;
  if (hasTransparentMargin) {
    side = Math.min(Math.max(contentWidth, contentHeight), bitmap.width, bitmap.height);
    const cx = bounds.left + contentWidth / 2;
    const cy = bounds.top + contentHeight / 2;
    sx = clamp(cx - side / 2, 0, bitmap.width - side);
    sy = clamp(cy - side / 2, 0, bitmap.height - side);
  } else {
    side = Math.min(bitmap.width, bitmap.height);
    sx = (bitmap.width - side) / 2;
    sy = (bitmap.height - side) / 2;
  }

  const size = Math.min(side, maxDimension);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image compression isn't supported in this browser.");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();

  return canvas.toDataURL("image/png");
}
