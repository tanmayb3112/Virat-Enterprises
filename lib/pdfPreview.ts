"use client";

// Real page thumbnails for the wizard's preview step.
//
// The step used to draw generic grey lines for every file and captioned itself
// "Rendered with pdf.js in production" — so a customer checking their document
// before paying was looking at a picture of a document, not theirs. These render
// the actual pages, which is the entire point of a print preview.

import { withPdfDocument, isImageName } from "@/lib/pageCount";

const THUMB_WIDTH = 320;

// Renders the first `limit` pages of a PDF to PNG data URLs.
export async function renderPdfThumbnails(file: File, limit: number): Promise<string[]> {
  return withPdfDocument(file, async (doc) => {
    const out: string[] = [];
    const count = Math.min(limit, doc.numPages);
    for (let n = 1; n <= count; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      // Pass the canvas alone. pdf.js rejects being given both a canvas and a
      // canvasContext — the context form is the legacy path and requires canvas
      // to be null — and the rejection is what silently emptied the preview.
      await page.render({ canvas, viewport }).promise;
      out.push(canvas.toDataURL("image/png"));
      page.cleanup();
    }
    return out;
  });
}

// Downscales an uploaded image to a thumbnail data URL, so the preview shows the
// customer's own artwork without holding a full-size bitmap in the DOM.
export async function renderImageThumbnail(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url;
    });
    const scale = Math.min(1, THUMB_WIDTH / (img.naturalWidth || THUMB_WIDTH));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((img.naturalWidth || THUMB_WIDTH) * scale));
    canvas.height = Math.max(1, Math.round((img.naturalHeight || THUMB_WIDTH) * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// What the preview step can actually show for a given file.
export async function renderThumbnails(file: File, limit: number): Promise<string[]> {
  if (isImageName(file.name)) {
    const one = await renderImageThumbnail(file);
    return one ? [one] : [];
  }
  if (file.name.toLowerCase().endsWith(".pdf")) {
    try {
      return await renderPdfThumbnails(file, limit);
    } catch (e) {
      // The customer still gets the layout schematic and can order; but an
      // empty preview should never be silent to whoever debugs it next.
      console.error("PDF preview failed:", e);
      return [];
    }
  }
  // Office formats cannot be rendered in the browser without a conversion
  // service; the preview step says so instead of faking it.
  return [];
}
