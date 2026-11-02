// In-browser image resizing for the admin (no server image service needed).
//
// - makeShareImage: the 1200x630 JPEG used for link previews. Renders an editorial
//   overlay card: cover photo + dark gradient + italic title + excerpt + VN branding.
//   WhatsApp skips og:image files much above ~300 KB, so quality steps down until
//   the file is under SHARE_MAX_BYTES.
// - makeShareImagePlain: legacy plain centre-crop (kept for rollback — do not delete).
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

// ── Text helpers ──────────────────────────────────────────────────────────────

function _trunc(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

/** Draw text word-wrapped into maxW px; returns line count. */
function _wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  maxLines = maxLines || 99;
  const words = text.split(' ');
  let line = '';
  let count = 0;
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, y + count * lineH);
      line = w + ' ';
      count++;
      if (count >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line.trim() && count < maxLines) {
    ctx.fillText(line.trim(), x, y + count * lineH);
    count++;
  }
  return count;
}

/** Filled rounded rect. */
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

// ── Share image — editorial overlay design ────────────────────────────────────

/**
 * 1200x630 JPEG editorial card.
 * `source`  = File/Blob or URL of the cover photo.
 * `meta`    = { title, excerpt, category, price } — optional; falls back to vignette crop.
 */
export async function makeShareImage(source, meta) {
  meta = meta || {};
  const bmp = await loadBitmap(source);
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');

  // ── 1. Background: cover photo, centre-cropped ──────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  const scale = Math.max(SHARE_W / bmp.width, SHARE_H / bmp.height);
  const dw = bmp.width * scale;
  const dh = bmp.height * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, (SHARE_W - dw) / 2, (SHARE_H - dh) / 2, dw, dh);
  bmp.close && bmp.close();

  // ── 2. Gradient overlay — lighter at top, heavier at bottom ────────────
  const grad = ctx.createLinearGradient(0, 0, 0, SHARE_H);
  grad.addColorStop(0,    'rgba(8,8,6,0.28)');
  grad.addColorStop(0.38, 'rgba(8,8,6,0.52)');
  grad.addColorStop(1,    'rgba(8,8,6,0.86)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);

  const title    = meta.title    || '';
  const excerpt  = meta.excerpt  || '';
  const category = meta.category || '';
  const price    = meta.price    || 0;

  // If no meta provided, return the vignette crop without text
  if (!title) {
    let blob = null;
    for (const q of [0.88, 0.80, 0.72, 0.62, 0.52, 0.42]) {
      blob = await toJpeg(canvas, q);
      if (blob.size <= SHARE_MAX_BYTES) break;
    }
    return blob;
  }

  const PAD   = 52;  // horizontal padding
  const textW = SHARE_W - PAD * 2;

  // ── 3. Category pill ────────────────────────────────────────────────────
  if (category) {
    const catLabel = category.toUpperCase();
    ctx.font = '500 19px Inter, Arial, sans-serif';
    const catW = ctx.measureText(catLabel).width + 30;
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    _roundRect(ctx, PAD, 44, catW, 34, 17);
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    ctx.fillText(catLabel, PAD + 15, 67);

    if (price > 0) {
      ctx.fillStyle = '#c8a96e';
      ctx.font = '600 17px Inter, Arial, sans-serif';
      ctx.fillText('KES ' + price, PAD + catW + 14, 67);
    }
  }

  // ── 4. Title — italic Playfair ──────────────────────────────────────────
  const titleSize = title.length > 40 ? 48 : title.length > 28 ? 54 : 60;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 400 ' + titleSize + "px 'Playfair Display', Georgia, 'Times New Roman', serif";
  const titleLineH = titleSize * 1.30;
  const titleLines = _wrapText(ctx, title, PAD, 156, textW, titleLineH, 3);
  const titleBot   = 156 + titleLines * titleLineH;

  // ── 5. Thin rule ────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, titleBot + 18);
  ctx.lineTo(SHARE_W - PAD, titleBot + 18);
  ctx.stroke();

  // ── 6. Excerpt ──────────────────────────────────────────────────────────
  if (excerpt) {
    ctx.fillStyle = 'rgba(255,255,255,0.68)';
    ctx.font      = '400 22px Inter, Arial, sans-serif';
    _wrapText(ctx, _trunc(excerpt, 130), PAD, titleBot + 50, textW, 32, 2);
  }

  // ── 7. Bottom bar: VN wordmark left, domain right ───────────────────────
  const botY = SHARE_H - 36;
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.font      = "italic 400 26px 'Playfair Display', Georgia, 'Times New Roman', serif";
  ctx.fillText("The Villager\u2019s Notes", PAD, botY);

  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.font      = '400 19px Inter, Arial, sans-serif';
  const domain  = 'thevillagersnotes.com';
  ctx.fillText(domain, SHARE_W - PAD - ctx.measureText(domain).width, botY);

  // ── 8. Compress to ≤250 KB ──────────────────────────────────────────────
  let blob = null;
  for (const q of [0.88, 0.80, 0.72, 0.62, 0.52, 0.42]) {
    blob = await toJpeg(canvas, q);
    if (blob.size <= SHARE_MAX_BYTES) break;
  }
  return blob;
}

/** Legacy plain centre-crop (no overlay text). Kept for rollback — do not delete. */
export async function makeShareImagePlain(source) {
  const bmp = await loadBitmap(source);
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#faf8f3';
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  const scale = Math.max(SHARE_W / bmp.width, SHARE_H / bmp.height);
  const w = bmp.width * scale;
  const h = bmp.height * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, (SHARE_W - w) / 2, (SHARE_H - h) / 2, w, h);
  bmp.close && bmp.close();
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
  if (file.size <= COVER_SHRINK_OVER_BYTES && longest <= COVER_MAX_SIDE) { bmp.close && bmp.close(); return file; }
  const scale = Math.min(1, COVER_MAX_SIDE / longest);
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(bmp.width  * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#faf8f3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close && bmp.close();
  const blob = await toJpeg(canvas, 0.85);
  return blob.size < file.size ? blob : file;
}
