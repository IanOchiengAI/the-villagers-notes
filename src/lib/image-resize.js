// In-browser image resizing for the admin (no server image service needed).
//
// - makeShareImage: the 1200x630 JPEG used for link previews. WhatsApp skips og:image files
//   much above ~300 KB, so quality steps down until the file is under SHARE_MAX_BYTES.
// - shrinkCover: keeps big phone photos from slowing down entry pages (cover max 1600 px).

const SHARE_W = 1200;
const SHARE_H = 630;
const SHARE_MAX_BYTES = 250 * 1024;
const COVER_MAX_SIDE = 1600;
const COVER_SHRINK_OVER_BYTES = 600 * 1024;

async function loadBitmap(source) {
  const blob = typeof source === 'string'
    ? await fetch(source, { mode: 'cors' }).then((r) => { if (!r.ok) throw new Error('Could not load the image'); return r.blob(); })
    : source;
  return createImageBitmap(blob);
}

function toJpeg(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image'))), 'image/jpeg', quality));
}

/** 1200x630 JPEG, centre-cropped ("cover" fit), under ~250 KB. `source` = File/Blob or URL. */
export async function makeShareImage(source) {
  const bmp = await loadBitmap(source);
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#faf8f3'; // the site's paper colour, behind any transparency
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  const scale = Math.max(SHARE_W / bmp.width, SHARE_H / bmp.height);
  const w = bmp.width * scale;
  const h = bmp.height * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, (SHARE_W - w) / 2, (SHARE_H - h) / 2, w, h);
  bmp.close?.();
  let blob = null;
  for (const q of [0.85, 0.78, 0.7, 0.6, 0.5, 0.4]) {
    blob = await toJpeg(canvas, q);
    if (blob.size <= SHARE_MAX_BYTES) break;
  }
  return blob;
}

/** Returns the file unchanged when it's already reasonable, else a JPEG at most 1600 px on its longest side. */
export async function shrinkCover(file) {
  const bmp = await loadBitmap(file);
  const longest = Math.max(bmp.width, bmp.height);
  if (file.size <= COVER_SHRINK_OVER_BYTES && longest <= COVER_MAX_SIDE) { bmp.close?.(); return file; }
  const scale = Math.min(1, COVER_MAX_SIDE / longest);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#faf8f3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  const blob = await toJpeg(canvas, 0.85);
  return blob.size < file.size ? blob : file;
}
