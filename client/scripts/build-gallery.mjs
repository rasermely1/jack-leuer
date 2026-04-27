#!/usr/bin/env node
/**
 * Gallery image pipeline.
 *
 * For every source image in `public/gallery/` and `public/evilmode/`,
 * emit responsive variants in
 *   - AVIF (best compression, broad modern-browser support)
 *   - WebP (universal modern fallback)
 *   - JPEG (legacy fallback, also covers cases where the browser refuses
 *     the modern formats for any reason)
 *
 * Variants are written to `public/img/<basename>/<width>.<ext>`. A tiny
 * blurred LQIP (low-quality image placeholder) is also emitted as a
 * base64 data URL so the page can paint a soft preview instantly while
 * the full image streams in.
 *
 * The script is idempotent: a variant is regenerated only when the
 * source file is newer than the output, so re-running on every dev /
 * build is essentially free after the first pass.
 *
 * Output: `src/app/gallery.manifest.json` — consumed by the Angular app
 * to build `<picture>` / `srcset` markup at runtime without ever needing
 * the original multi-megabyte file.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'public', 'img');
const manifestTsPath = path.join(projectRoot, 'src', 'app', 'gallery.manifest.ts');
const SOURCE_DIRS = [
  { prefix: '', dir: path.join(projectRoot, 'public', 'gallery') },
  { prefix: 'evilmode', dir: path.join(projectRoot, 'public', 'evilmode') },
];

const TARGET_WIDTHS = [480, 800, 1200, 1600, 2400];

// Quality knobs are tuned to be visually indistinguishable from the
// originals at the rendered display sizes while still cutting bytes by
// 80–95%. Bump these if you ever spot a regression on a specific image.
const QUALITY = {
  avif: 62,
  webp: 78,
  jpg: 86,
};

const FORMATS = /** @type {const} */ (['avif', 'webp', 'jpg']);

const SOURCE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

/** @typedef {{
 *   file: string;
 *   base: string;
 *   width: number;
 *   height: number;
 *   aspectRatio: number;
 *   lqip: string;
 *   widths: number[];
 * }} ManifestEntry */

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function newer(target, source) {
  if (!(await exists(target))) return false;
  const [a, b] = await Promise.all([fs.stat(target), fs.stat(source)]);
  return a.mtimeMs >= b.mtimeMs;
}

async function listSourceImages() {
  const all = [];
  for (const source of SOURCE_DIRS) {
    if (!(await exists(source.dir))) continue;
    const entries = await fs.readdir(source.dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      const key = source.prefix ? `${source.prefix}/${entry.name}` : entry.name;
      all.push({ key, fileName: entry.name, sourceDir: source.dir });
    }
  }
  return all.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Pick the set of widths to emit for a given source: never upscale, and
 * always include the source's natural width as a final cap so high-DPR
 * displays still have a sharp option.
 */
function pickWidths(naturalWidth) {
  const widths = TARGET_WIDTHS.filter((w) => w < naturalWidth);
  widths.push(naturalWidth);
  return [...new Set(widths)].sort((a, b) => a - b);
}

async function makeLqip(input) {
  const buffer = await sharp(input)
    .rotate()
    .resize({ width: 24 })
    .blur(0.6)
    .jpeg({ quality: 35, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

async function emitVariant(input, output, width, format) {
  let pipeline = sharp(input).rotate().resize({ width, withoutEnlargement: true });
  if (format === 'avif') {
    pipeline = pipeline.avif({ quality: QUALITY.avif, effort: 4 });
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality: QUALITY.webp, effort: 4 });
  } else {
    pipeline = pipeline.jpeg({ quality: QUALITY.jpg, mozjpeg: true, progressive: true });
  }
  await pipeline.toFile(output);
}

async function processOne(source) {
  const sourcePath = path.join(source.sourceDir, source.fileName);
  const base = source.key.replace(/\.[^.]+$/, '');
  const dir = path.join(outputDir, ...base.split('/'));
  await fs.mkdir(dir, { recursive: true });

  const meta = await sharp(sourcePath).rotate().metadata();
  const naturalWidth = meta.width ?? 0;
  const naturalHeight = meta.height ?? 0;
  if (!naturalWidth || !naturalHeight) {
    throw new Error(`Could not read dimensions for ${file}`);
  }

  const widths = pickWidths(naturalWidth);

  let regenerated = 0;
  for (const format of FORMATS) {
    for (const width of widths) {
      const outPath = path.join(dir, `${width}.${format}`);
      if (await newer(outPath, sourcePath)) continue;
      await emitVariant(sourcePath, outPath, width, format);
      regenerated++;
    }
  }

  // LQIP is small enough to just always recompute when the source is
  // newer than the manifest on disk; the cost is negligible.
  const lqip = await makeLqip(sourcePath);

  /** @type {ManifestEntry} */
  const entry = {
    file: source.key,
    base,
    width: naturalWidth,
    height: naturalHeight,
    aspectRatio: +(naturalWidth / naturalHeight).toFixed(4),
    lqip,
    widths,
  };

  return { entry, regenerated };
}

async function main() {
  const files = await listSourceImages();
  if (files.length === 0) {
    console.log(`${DIM}No source images found in configured source dirs${RESET}`);
    return;
  }

  await fs.mkdir(outputDir, { recursive: true });

  const start = Date.now();
  /** @type {Record<string, ManifestEntry>} */
  const photos = {};
  let totalRegenerated = 0;

  // Process serially: sharp is already multi-threaded internally and
  // running many encodes in parallel just thrashes memory on big JPEGs.
  for (const source of files) {
    const { entry, regenerated } = await processOne(source);
    photos[source.key] = entry;
    totalRegenerated += regenerated;
    const tag = regenerated > 0 ? `${GREEN}generated ${regenerated}${RESET}` : `${DIM}cached${RESET}`;
    console.log(`${CYAN}gallery${RESET} ${source.key} ${DIM}→${RESET} ${tag}`);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    formats: FORMATS,
    photos,
  };

  // Emit a TypeScript module so the Angular app can consume the manifest
  // with full typing and zero runtime JSON parsing. Generated — do not
  // edit by hand; rerun `npm run gallery` instead.
  const ts =
    `// AUTO-GENERATED by scripts/build-gallery.mjs — do not edit by hand.\n` +
    `// Regenerate with \`npm run gallery\`.\n` +
    `\n` +
    `export type GalleryFormat = 'avif' | 'webp' | 'jpg';\n` +
    `\n` +
    `export interface GalleryPhotoManifest {\n` +
    `  file: string;\n` +
    `  base: string;\n` +
    `  width: number;\n` +
    `  height: number;\n` +
    `  aspectRatio: number;\n` +
    `  lqip: string;\n` +
    `  widths: number[];\n` +
    `}\n` +
    `\n` +
    `export interface GalleryManifest {\n` +
    `  generatedAt: string;\n` +
    `  formats: readonly GalleryFormat[];\n` +
    `  photos: Record<string, GalleryPhotoManifest>;\n` +
    `}\n` +
    `\n` +
    `export const GALLERY_MANIFEST: GalleryManifest = ${JSON.stringify(manifest, null, 2)} as const;\n`;

  await fs.writeFile(manifestTsPath, ts);

  const ms = Date.now() - start;
  console.log(
    `\n${GREEN}gallery pipeline done${RESET} ${DIM}— ${files.length} photos, ${totalRegenerated} variants written, ${ms}ms${RESET}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
