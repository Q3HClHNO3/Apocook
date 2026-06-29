#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCANNED_EXTENSIONS = new Set([".html", ".js", ".css", ".json", ".md"]);
const CANDIDATE_EXTENSIONS = new Set([
  ".js",
  ".css",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg"
]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const IGNORE_DIRS = new Set([".git", "node_modules", "archive"]);
const KEEP_DOC_PREFIXES = ["docs/", "data/templates/"];
const ROOT_RELATIVE_PREFIXES = new Set([
  "ApoCHEF-Kitchen",
  "FlightGallery-Airplane",
  "SearchMap-City",
  "assets",
  "data",
  "data-input",
  "docs",
  "scripts",
  "styles"
]);
const LEGACY_FILES = new Set([
  "data/flights.json",
  "FlightGallery-Airplane/cityData.json"
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function walk(dir, files = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    if (IGNORE_DIRS.has(entry.name)) return;
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, files);
      return;
    }
    files.push(absolutePath);
  });
  return files;
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return "";
  }
}

function resolveReference(fromFile, rawReference) {
  if (!rawReference || /^[a-z]+:/i.test(rawReference) || rawReference.startsWith("#")) return null;
  const cleanReference = rawReference.split(/[?#]/)[0];
  if (!cleanReference || cleanReference.startsWith("//")) return null;

  const baseDir = path.dirname(fromFile);
  const firstSegment = cleanReference.split("/")[0];
  const relativeCandidate = path.resolve(baseDir, cleanReference);
  const rootCandidate = cleanReference.startsWith("/")
    ? path.join(ROOT, cleanReference)
    : path.resolve(ROOT, cleanReference);
  const absoluteReference = cleanReference.startsWith("/")
    ? rootCandidate
    : fs.existsSync(relativeCandidate)
      ? relativeCandidate
      : ROOT_RELATIVE_PREFIXES.has(firstSegment)
        ? rootCandidate
        : relativeCandidate;

  if (!absoluteReference.startsWith(ROOT)) return null;
  return toPosix(path.relative(ROOT, absoluteReference));
}

function extractReferences(filePath, content) {
  const refs = new Set();
  const patterns = [
    /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi,
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    /\bfetch\(\s*["']([^"']+)["']/gi,
    /new URL\(\s*["']([^"']+)["']/gi,
    /(?:window\.location\.href|data-href)\s*=\s*["']([^"']+)["']/gi,
    /["']((?:\.\.?\/|[A-Za-z0-9_-]+\/)[^"']+\.(?:html|js|css|json|png|jpg|jpeg|webp|gif|svg)(?:[?#][^"']*)?)["']/gi,
    /(?:^|[\s`])((?:\.\.?\/|[A-Za-z0-9_-]+\/)[^\s`"']+\.(?:html|js|css|json|png|jpg|jpeg|webp|gif|svg)(?:[?#][^\s`"']*)?)/g
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const resolved = resolveReference(filePath, match[1]);
      if (resolved) refs.add(resolved);
    }
  });

  if (path.basename(filePath) === "database.js") {
    const dataBaseUrlPattern = /new URL\(\s*["']([^"']+\.json)["']\s*,\s*DATA_BASE_URL\s*\)/gi;
    let match;
    while ((match = dataBaseUrlPattern.exec(content)) !== null) {
      refs.add(`data/${match[1]}`);
    }
  }

  return refs;
}

function printSection(title, items, emptyText = "none") {
  console.log(`\n${title}`);
  if (!items.length) {
    console.log(`  ${emptyText}`);
    return;
  }
  items.forEach((item) => console.log(`  - ${item}`));
}

const allFiles = walk(ROOT).map((absolutePath) => ({
  absolutePath,
  relativePath: toPosix(path.relative(ROOT, absolutePath)),
  extension: path.extname(absolutePath).toLowerCase()
}));

const scannedFiles = allFiles.filter((file) => SCANNED_EXTENSIONS.has(file.extension));
const candidateFiles = allFiles.filter((file) => CANDIDATE_EXTENSIONS.has(file.extension));
const referenced = new Set();

scannedFiles.forEach((file) => {
  const refs = extractReferences(file.absolutePath, readText(file.absolutePath));
  refs.forEach((ref) => referenced.add(ref));
});

const referencedExisting = [...referenced].filter((ref) => fs.existsSync(path.join(ROOT, ref))).sort();
const candidateRuntimeFiles = candidateFiles.filter((file) => {
  if (KEEP_DOC_PREFIXES.some((prefix) => file.relativePath.startsWith(prefix))) return false;
  return [".js", ".css", ".json"].includes(file.extension);
});
const possibleUnusedRuntime = candidateRuntimeFiles
  .filter((file) => !referenced.has(file.relativePath))
  .map((file) => file.relativePath)
  .sort();
const possibleUnusedAssets = candidateFiles
  .filter((file) => IMAGE_EXTENSIONS.has(file.extension))
  .filter((file) => !referenced.has(file.relativePath))
  .map((file) => file.relativePath)
  .sort();
const legacyFiles = [...LEGACY_FILES].filter((file) => fs.existsSync(path.join(ROOT, file))).sort();
const keepDocsAndTemplates = allFiles
  .map((file) => file.relativePath)
  .filter((file) => KEEP_DOC_PREFIXES.some((prefix) => file.startsWith(prefix)))
  .sort();

console.log("Apocook file audit");
console.log(`\nscanned text files: ${scannedFiles.length}`);
console.log(`candidate runtime/assets: ${candidateFiles.length}`);
console.log(`referenced existing files: ${referencedExisting.length}`);

printSection("referenced files", referencedExisting);
printSection("possibly unreferenced JS/CSS/JSON", possibleUnusedRuntime);
printSection("possibly unreferenced images/assets", possibleUnusedAssets);
printSection("legacy files requiring manual decision", legacyFiles);
printSection("not recommended for deletion: docs and templates", keepDocsAndTemplates);
