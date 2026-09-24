const INK = '#1E2B33';
const SOFT = '#54636c';
const PAPER = '#F7F8F5';

/**
 * Draws the 3D canvas plus a spec band underneath and returns a PNG blob.
 * rows: [{ part, main, detail, hex }]
 */
export async function composeSpecImage(canvas, rows, subtitleLines = ['Gaminama pagal užsakymą'], title = 'Kėdė') {
  if (document.fonts?.ready) await document.fonts.ready;

  const W = canvas.width;
  const H = canvas.height;
  const u = W / 1000; // scale unit so text stays proportional
  const band = Math.round(190 * u);

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H + band;
  const ctx = out.getContext('2d');

  ctx.drawImage(canvas, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, H, W, band);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = `${30 * u}px "Young Serif", Georgia, serif`;
  ctx.fillText(title, 40 * u, H + 74 * u);
  ctx.fillStyle = SOFT;
  ctx.font = `${19 * u}px Figtree, system-ui, sans-serif`;
  subtitleLines.forEach((line, i) => ctx.fillText(line, 40 * u, H + (106 + i * 26) * u));

  const startX = 300 * u;
  const colW = (W - startX - 40 * u) / rows.length;
  rows.forEach((r, i) => {
    const x = startX + i * colW;
    // colour chip
    ctx.fillStyle = r.hex;
    ctx.beginPath();
    ctx.arc(x + 11 * u, H + 52 * u, 11 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1 * u;
    ctx.stroke();

    ctx.fillStyle = SOFT;
    ctx.font = `${20 * u}px Figtree, system-ui, sans-serif`;
    ctx.fillText(r.part, x + 32 * u, H + 59 * u);

    ctx.fillStyle = INK;
    ctx.font = `600 ${27 * u}px Figtree, system-ui, sans-serif`;
    ctx.fillText(r.main, x, H + 104 * u);
    ctx.font = `${23 * u}px Figtree, system-ui, sans-serif`;
    ctx.fillText(r.detail, x, H + 138 * u);
  });

  return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
