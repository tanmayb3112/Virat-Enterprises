// Copies the pdf.js worker into public/ so the browser can load it from a
// stable URL (/pdf.worker.min.mjs).
//
// Why a copy step rather than importing it: resolving the worker through the
// bundler (new URL(..., import.meta.url)) depends on webpack asset-module
// behaviour that differs between dev, build and Vercel, and a worker that fails
// to load takes page counting and previews down with it. A plain file in
// public/ is resolved by the browser, not the bundler, so it behaves the same
// everywhere. The file is generated, so it stays out of git.
//
// Runs from the prebuild/predev npm scripts.

import { copyFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(root, "public", "pdf.worker.min.mjs");

// LEGACY first, to match the legacy main build lib/pageCount.ts imports: the
// default build uses very new JS (Map.prototype.getOrInsertComputed and friends)
// that throws on older Android Chrome. Mixing flavours would put that syntax
// back in via the worker.
const CANDIDATES = [
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  "pdfjs-dist/build/pdf.worker.min.mjs",
  "pdfjs-dist/build/pdf.worker.mjs",
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

let src = "";
for (const rel of CANDIDATES) {
  const p = join(root, "node_modules", rel);
  if (await exists(p)) {
    src = p;
    break;
  }
}

if (!src) {
  // Not fatal: the app degrades to manual page entry and no PDF thumbnails.
  console.warn("[copy-pdf-worker] pdf.js worker not found in node_modules — skipping.");
  process.exit(0);
}

await mkdir(dirname(DEST), { recursive: true });
await copyFile(src, DEST);
console.log(`[copy-pdf-worker] ${src.replace(root + "/", "")} → public/pdf.worker.min.mjs`);
