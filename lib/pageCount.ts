"use client";

// Page counting for every file type the shop accepts.
//
// Getting this right is the difference between a quote and a guess: the whole
// bill is page_count × rate. Previously only images resolved (hard-coded 1) and
// PDFs were counted by regexing the raw bytes for "/Type /Page", which silently
// returns 0 for any PDF 1.5+ that keeps its page objects inside compressed
// object streams — i.e. most modern PDFs. Everything else fell through to 0 and
// blocked the wizard behind a manual entry box.
//
// Each format is read properly where the format allows it, and where it does not
// (legacy binary .doc, spreadsheets) we say so plainly and ask, rather than
// inventing a number. `source` travels with the order so staff know what to
// re-check on the dashboard.

// Type-only, so pdf.js itself is still loaded on demand rather than bundled.
import type { PDFDocumentProxy } from "pdfjs-dist";


export type PageSource = "parsed" | "estimated" | "manual" | "unknown";

export interface PageCountResult {
  pages: number; // 0 = could not determine, ask the customer
  source: PageSource;
  note: string; // shown under the file row
}

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif", "tif", "tiff"];
const TEXT_EXT = ["txt", "md", "csv", "log", "rtf"];

// A text page at the shop's default settings, near enough for a quote that
// staff confirm anyway.
const LINES_PER_PAGE = 46;
const WORDS_PER_PAGE = 500;

export function extensionOf(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

export function isImageName(name: string): boolean {
  return IMAGE_EXT.includes(extensionOf(name));
}

let workerConfigured = false;

// pdf.js, loaded on demand so the ~1MB of parser never lands on the initial
// page load of a mobile-first site.
async function loadPdfjs() {
  // The LEGACY build, deliberately, and as a literal specifier.
  //
  // Legacy because pdfjs-dist 6's default build targets very recent browsers and
  // calls things like Map.prototype.getOrInsertComputed — verified failing with
  // "getOrInsertComputed is not a function" on a 2025 Chromium. Many of the
  // shop's customers are on older Android Chrome or WebView, and a preview that
  // only works on new phones is not much of a preview.
  //
  // A literal because webpack cannot resolve import() of a variable: doing that
  // made both counting and rendering fail at runtime while still building
  // cleanly.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!workerConfigured) {
    // The matching legacy worker, served from public/ by
    // scripts/copy-pdf-worker.mjs. Main build and worker must be the same
    // flavour, or the worker reintroduces the modern syntax.
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerConfigured = true;
  }
  return pdfjs as typeof import("pdfjs-dist");
}

// Opens a PDF, hands it to `fn`, and always tears the worker task down again —
// destroy() lives on the loading task rather than the document, and a leaked
// task keeps a worker and the whole file buffer alive.
export async function withPdfDocument<T>(
  file: File,
  fn: (doc: PDFDocumentProxy) => Promise<T>
): Promise<T> {
  const task = await openTask(file);
  try {
    return await fn(await task.promise);
  } finally {
    await task.destroy();
  }
}

async function openTask(file: File) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data });
}

// Reads only the named entries out of a zip container (docx/pptx/xlsx/odt are
// all zips), decompressing nothing else — these files can be 25MB.
async function readZipEntries(file: File, wanted: (name: string) => boolean) {
  const { unzipSync } = await import("fflate");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return unzipSync(bytes, { filter: (f) => wanted(f.name) });
}

function decode(bytes: Uint8Array | undefined): string {
  return bytes ? new TextDecoder().decode(bytes) : "";
}

// Word records a page count in docProps/app.xml when it saves. Editors that are
// not Word (Google Docs exports, some converters) leave it out or write 1, so a
// missing or suspicious value falls through to a word-count estimate.
async function countDocx(file: File): Promise<PageCountResult> {
  try {
    const entries = await readZipEntries(
      file,
      (n) => n === "docProps/app.xml" || n === "word/document.xml"
    );
    const app = decode(entries["docProps/app.xml"]);
    const recorded = Number(app.match(/<Pages>(\d+)<\/Pages>/)?.[1] ?? 0);

    const body = decode(entries["word/document.xml"]);
    const text = body.replace(/<[^>]+>/g, " ");
    const words = text.split(/\s+/).filter(Boolean).length;
    const estimate = Math.max(1, Math.ceil(words / WORDS_PER_PAGE));

    // Trust Word's own count unless it looks stale against the actual text.
    if (recorded > 0 && (recorded >= estimate || words === 0)) {
      return {
        pages: recorded,
        source: "parsed",
        note: `${recorded} page${recorded === 1 ? "" : "s"} · as saved by Word`,
      };
    }
    if (words > 0) {
      return {
        pages: estimate,
        source: "estimated",
        note: `about ${estimate} page${estimate === 1 ? "" : "s"} · estimated from ${words} words, the shop confirms`,
      };
    }
    return { pages: 0, source: "unknown", note: "could not read this document" };
  } catch {
    return { pages: 0, source: "unknown", note: "could not read this document" };
  }
}

// One slide prints as one page.
async function countPptx(file: File): Promise<PageCountResult> {
  try {
    const entries = await readZipEntries(file, (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    const slides = Object.keys(entries).length;
    if (slides > 0) {
      return {
        pages: slides,
        source: "parsed",
        note: `${slides} slide${slides === 1 ? "" : "s"}`,
      };
    }
    return { pages: 0, source: "unknown", note: "could not read this presentation" };
  } catch {
    return { pages: 0, source: "unknown", note: "could not read this presentation" };
  }
}

// OpenDocument stores a real page count in its metadata.
async function countOdf(file: File, label: string): Promise<PageCountResult> {
  try {
    const entries = await readZipEntries(file, (n) => n === "meta.xml");
    const meta = decode(entries["meta.xml"]);
    const pages = Number(meta.match(/meta:page-count="(\d+)"/)?.[1] ?? 0);
    if (pages > 0) {
      return { pages, source: "parsed", note: `${pages} page${pages === 1 ? "" : "s"}` };
    }
    return { pages: 0, source: "unknown", note: `could not read this ${label}` };
  } catch {
    return { pages: 0, source: "unknown", note: `could not read this ${label}` };
  }
}

async function countText(file: File): Promise<PageCountResult> {
  try {
    const text = await file.text();
    const lines = text.split(/\r\n|\r|\n/).length;
    const pages = Math.max(1, Math.ceil(lines / LINES_PER_PAGE));
    return {
      pages,
      source: "estimated",
      note: `about ${pages} page${pages === 1 ? "" : "s"} · estimated from ${lines} lines`,
    };
  } catch {
    return { pages: 0, source: "unknown", note: "could not read this file" };
  }
}

export async function countPages(file: File): Promise<PageCountResult> {
  const ext = extensionOf(file.name);

  if (ext === "pdf") {
    try {
      const pages = await withPdfDocument(file, async (doc) => doc.numPages);
      if (pages > 0) {
        return { pages, source: "parsed", note: `${pages} page${pages === 1 ? "" : "s"}` };
      }
      return { pages: 0, source: "unknown", note: "could not read this PDF" };
    } catch {
      // Encrypted or damaged PDFs land here.
      return {
        pages: 0,
        source: "unknown",
        note: "could not read this PDF — it may be password-protected",
      };
    }
  }

  if (IMAGE_EXT.includes(ext)) {
    return { pages: 1, source: "parsed", note: "1 page · image" };
  }

  if (ext === "docx") return countDocx(file);
  if (ext === "pptx") return countPptx(file);
  if (ext === "odt" || ext === "odp") return countOdf(file, ext === "odt" ? "document" : "presentation");
  if (TEXT_EXT.includes(ext)) return countText(file);

  // Spreadsheets have no fixed page count — how many pages an .xlsx prints
  // depends on print areas, scaling and column widths, so guessing would put a
  // wrong number on a real bill.
  if (ext === "xlsx" || ext === "xls" || ext === "ods" || ext === "csv") {
    return {
      pages: 0,
      source: "unknown",
      note: "spreadsheets have no fixed page count — tell us how many pages to print",
    };
  }

  // Legacy binary Office formats keep the count in an OLE metadata stream that
  // is not worth parsing in the browser.
  if (ext === "doc" || ext === "ppt") {
    return {
      pages: 0,
      source: "unknown",
      note: "older Office format — please enter the page count (or re-save as .docx and we read it automatically)",
    };
  }

  return { pages: 0, source: "unknown", note: "unrecognised file type — please enter the page count" };
}
