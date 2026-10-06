export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_OUTPUT_SIDE = 4096;
const BUCKET_LIMIT = 11 * 1024 * 1024;

export class ImageError extends Error {}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageError("That file couldn't be read as a picture."));
    img.src = src;
  });
}

export function validateFile(file: File) {
  if (!file.type.startsWith("image/")) throw new ImageError("Please choose an image file.");
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name))
    throw new ImageError("HEIC photos aren't supported by browsers. Export it as a JPG or PNG first.");
  if (file.size > MAX_UPLOAD_BYTES) throw new ImageError("That picture is over 15 MB. Try a smaller one.");
}

export async function fetchImageFromUrl(url: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ImageError("That site doesn't let us use its pictures. Save the image and upload it instead.");
  }
  if (!res.ok) throw new ImageError("We couldn't load that link.");
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) throw new ImageError("That link isn't a picture.");
  if (blob.size > MAX_UPLOAD_BYTES) throw new ImageError("That picture is over 15 MB. Try a smaller one.");
  return blob;
}

export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Cropped {
  blob: Blob;
  width: number;
  height: number;
  /** True when a small picture was enlarged and sharpened. */
  enhanced: boolean;
}

/** Pictures with a longest side below this get enlarged and sharpened. */
export const ENHANCE_BELOW = 1800;
const ENHANCE_TARGET = 3000;

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const d = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / d;
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / d;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** Three box blurs approximate a Gaussian. */
function gaussish(src: Float32Array, w: number, h: number, r: number): Float32Array {
  return boxBlur(boxBlur(boxBlur(src, w, h, r), w, h, r), w, h, r);
}

/**
 * Unsharp mask on brightness only (no colour fringes). A wide pass restores the edge crispness lost to
 * enlarging, a fine pass brings back texture. Tiny differences are left alone so noise and JPEG blocks
 * are not boosted.
 */
function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number, factor: number) {
  const im = ctx.getImageData(0, 0, w, h);
  const px = im.data;
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  const wide = gaussish(lum, w, h, Math.max(1, Math.round(factor * 0.55)));
  const fine = gaussish(lum, w, h, 1);
  const NOISE = 2.5;
  for (let i = 0; i < n; i++) {
    const a = lum[i] - wide[i];
    const b = lum[i] - fine[i];
    const da = Math.abs(a) < NOISE ? 0 : a;
    const db = Math.abs(b) < NOISE ? 0 : b;
    const add = da * 0.9 + db * 0.5;
    px[i * 4] += add;
    px[i * 4 + 1] += add;
    px[i * 4 + 2] += add;
  }
  ctx.putImageData(im, 0, 0);
}

/**
 * Cuts the chosen area out of the picture. Huge pictures are shrunk; small ones are enlarged in
 * gentle steps and sharpened, so pieces look cleaner when zoomed in (no new detail can be invented,
 * but soft, blocky edges are avoided).
 */
export async function cropToBlob(img: HTMLImageElement, area: PixelArea): Promise<Cropped> {
  const longest = Math.max(area.width, area.height);
  const small = longest < ENHANCE_BELOW;
  const scale = small ? Math.min(4, ENHANCE_TARGET / longest) : Math.min(1, MAX_OUTPUT_SIDE / longest);
  const enhanced = small && scale >= 1.25;
  const width = Math.max(2, Math.round(area.width * (enhanced ? scale : Math.min(1, scale))));
  const height = Math.max(2, Math.round(area.height * (enhanced ? scale : Math.min(1, scale))));

  // 1:1 cut, then double at a time (one big jump looks blockier than several small ones)
  let cur = document.createElement("canvas");
  cur.width = Math.max(2, Math.round(area.width));
  cur.height = Math.max(2, Math.round(area.height));
  let cctx = cur.getContext("2d")!;
  cctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, cur.width, cur.height);
  while (cur.width !== width || cur.height !== height) {
    const nw = enhanced ? Math.min(width, Math.round(cur.width * 2)) : width;
    const nh = enhanced ? Math.min(height, Math.round(cur.height * 2)) : height;
    const next = document.createElement("canvas");
    next.width = nw;
    next.height = nh;
    cctx = next.getContext("2d")!;
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = "high";
    cctx.drawImage(cur, 0, 0, nw, nh);
    cur = next;
  }
  if (enhanced) sharpen(cctx, width, height, scale);

  for (const quality of [0.92, 0.85, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((r) => cur.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= BUCKET_LIMIT) return { blob, width, height, enhanced };
  }
  throw new ImageError("That picture is too detailed to upload. Try a smaller crop.");
}
