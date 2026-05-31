import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, "");
const sourceDir = join(rootDir, "website");
const outputDir = join(rootDir, "dist", "website");
const strict = process.argv.includes("--strict");
const skipVideo = process.argv.includes("--skip-video");
const imageExtensions = new Set([".png", ".jpg", ".jpeg"]);
const videoExtensions = new Set([".mp4", ".mov"]);
const rewriteExtensions = new Set([".html", ".css", ".js", ".json", ".txt", ".webmanifest"]);
const keepOriginalImages = new Set([
  "assets/favicon.png",
  "assets/apple-touch-icon.png",
  "favicon.png",
  "apple-touch-icon.png"
]);

const deployFiles = [
  "index.html",
  "app.js",
  "player-animations.js",
  "player-data.js",
  "styles.css",
  "CNAME",
  "favicon.png",
  "apple-touch-icon.png"
];

const deployDirs = ["assets"];

function hasCommand(command) {
  const check = spawnSync(command, ["-version"], { stdio: "ignore" });
  return check.status === 0;
}

function failOrWarn(message) {
  if (strict) {
    throw new Error(message);
  }

  console.warn(`warning: ${message}`);
}

function copyFile(source, target) {
  mkdirSync(dirname(target), { recursive: true });
  execFileSync("cp", ["-p", source, target]);
}

function copyDir(source, target) {
  for (const name of readdirSync(source)) {
    if (name.startsWith(".")) {
      continue;
    }

    const sourcePath = join(source, name);
    const targetPath = join(target, name);
    const stats = statSync(sourcePath);

    if (stats.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else if (stats.isFile()) {
      copyFile(sourcePath, targetPath);
    }
  }
}

function walkFiles(dir) {
  const files = [];

  for (const name of readdirSync(dir)) {
    const filePath = join(dir, name);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      files.push(...walkFiles(filePath));
    } else if (stats.isFile()) {
      files.push(filePath);
    }
  }

  return files;
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function dirSize(dir) {
  return walkFiles(dir).reduce((total, file) => total + statSync(file).size, 0);
}

function rewriteReferences(rewrites) {
  if (rewrites.length === 0) {
    return;
  }

  for (const file of walkFiles(outputDir)) {
    if (!rewriteExtensions.has(extname(file).toLowerCase())) {
      continue;
    }

    let content = readFileSync(file, "utf8");
    let changed = false;

    for (const [from, to] of rewrites) {
      const variants = [
        [`./${from}`, `./${to}`],
        [from, to]
      ];

      for (const [needle, replacement] of variants) {
        if (content.includes(needle)) {
          content = content.split(needle).join(replacement);
          changed = true;
        }
      }
    }

    if (changed) {
      writeFileSync(file, content);
    }
  }
}

function optimizeImages() {
  if (!hasCommand("cwebp")) {
    failOrWarn("cwebp is required to optimize images");
    return [];
  }

  const rewrites = [];

  for (const file of walkFiles(outputDir)) {
    const ext = extname(file).toLowerCase();
    const rel = relative(outputDir, file);

    if (!imageExtensions.has(ext) || keepOriginalImages.has(rel)) {
      continue;
    }

    const webpFile = file.slice(0, -ext.length) + ".webp";
    const result = spawnSync("cwebp", ["-quiet", "-mt", "-m", "6", "-q", "82", file, "-o", webpFile], {
      encoding: "utf8"
    });

    if (result.status !== 0 || !existsSync(webpFile)) {
      failOrWarn(`failed to optimize image ${rel}`);
      continue;
    }

    const webpRel = relative(outputDir, webpFile);
    rewrites.push([rel, webpRel]);
    rmSync(file);
  }

  return rewrites;
}

function optimizeVideos() {
  if (skipVideo) {
    return { count: 0, rewrites: [] };
  }

  if (!hasCommand("ffmpeg")) {
    failOrWarn("ffmpeg is required to optimize videos");
    return { count: 0, rewrites: [] };
  }

  let count = 0;
  const rewrites = [];

  for (const file of walkFiles(outputDir)) {
    const ext = extname(file).toLowerCase();

    if (!videoExtensions.has(ext)) {
      continue;
    }

    const rel = relative(outputDir, file);
    const targetFile = ext === ".mov" ? file.slice(0, -ext.length) + ".mp4" : file;
    const optimizedFile = `${targetFile}.optimized.mp4`;
    const args = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      file,
      "-an",
      "-vf",
      "scale='min(720,iw)':-2",
      "-r",
      "24",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "29",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      optimizedFile
    ];
    const result = spawnSync("ffmpeg", args, { encoding: "utf8" });

    if (result.status !== 0 || !existsSync(optimizedFile)) {
      failOrWarn(`failed to optimize video ${rel}`);
      rmSync(optimizedFile, { force: true });
      continue;
    }

    rmSync(file);
    execFileSync("mv", [optimizedFile, targetFile]);

    if (targetFile !== file) {
      rewrites.push([rel, relative(outputDir, targetFile)]);
    }

    count += 1;
  }

  return { count, rewrites };
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

for (const file of deployFiles) {
  const source = join(sourceDir, file);

  if (existsSync(source)) {
    copyFile(source, join(outputDir, file));
  }
}

for (const dir of deployDirs) {
  const source = join(sourceDir, dir);

  if (existsSync(source)) {
    copyDir(source, join(outputDir, dir));
  }
}

const initialSize = dirSize(outputDir);
const imageRewrites = optimizeImages();
rewriteReferences(imageRewrites);
const optimizedVideos = optimizeVideos();
rewriteReferences(optimizedVideos.rewrites);
const finalSize = dirSize(outputDir);

console.log(`Built ${relative(rootDir, outputDir)}`);
console.log(`Images converted: ${imageRewrites.length}`);
console.log(`Videos optimized: ${optimizedVideos.count}`);
console.log(`Size: ${formatBytes(initialSize)} -> ${formatBytes(finalSize)}`);
