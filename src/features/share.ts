/**
 * Fähigkeit `sharing` — Teilen & Export (Spec §33).
 *
 * Hoher Verbreitungswert bei geringem Aufwand. Die aktuelle Ansicht (Zifferblatt
 * oder Himmelskarte) wird direkt aus dem SVG in ein sauberes Bild gerendert —
 * kein Bildschirmfoto, dadurch volle Auflösung ohne Bedienelemente. Das Bild
 * trägt dezent Datum, Uhrzeit, Ort und einen kurzen Projekthinweis.
 *
 * Auf Web: Download sowie Web Share API, wo verfügbar (§33). Native Umsetzung
 * (Skia rendert direkt in ein Bild) folgt im nativen Aufsatz.
 */

export interface ShareMeta {
  title: string;
  caption: string; // Datum · Uhrzeit · Ort
  brand: string; // Projekthinweis
  bg: string;
  text: string;
  textDim: string;
}

const OUT = 800; // Kantenlänge des Exports (2× der 400er-viewBox)
const PAD = 48;

/** Rendert ein SVG-Element in einen PNG-Blob mit Fusszeile. */
export async function renderViewToBlob(svg: SVGElement, meta: ShareMeta): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('width', String(OUT));
  clone.setAttribute('height', String(OUT));
  const xml = new XMLSerializer().serializeToString(clone);
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

  const img = await loadImage(svgUrl);

  const canvas = document.createElement('canvas');
  canvas.width = OUT + PAD * 2;
  canvas.height = OUT + PAD * 2 + 120;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-context-unavailable');

  ctx.fillStyle = meta.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, PAD, PAD, OUT, OUT);

  // Fusszeile: Titel + Datum/Ort + Projekthinweis.
  const cx = canvas.width / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = meta.text;
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillText(meta.title, cx, OUT + PAD + 44);
  ctx.fillStyle = meta.textDim;
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(meta.caption, cx, OUT + PAD + 78);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(meta.brand, cx, OUT + PAD + 108);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob-failed'))), 'image/png');
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-load-failed'));
    img.src = src;
  });
}

/** Web Share API mit Datei, sonst Download. */
export async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return;
    } catch {
      /* Nutzer hat abgebrochen oder Share fehlgeschlagen → Download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
