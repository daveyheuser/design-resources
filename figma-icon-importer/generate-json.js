#!/usr/bin/env node

// generate-json.js — Generates the icon import JSON from @central-icons-react/all
//
// Usage:
//   node generate-json.js                      # all icons
//   node generate-json.js --since 2025-03-01   # only icons created after a date
//   node generate-json.js --names sparkle,bolt  # only specific icons (kebab-case)
//   node generate-json.js --diff 1.1.170       # icons added since a previous version
//
// Output: writes icon-import.json to the current directory

const fs = require("fs");
const path = require("path");

// --- Parse arguments ---
const args = process.argv.slice(2);
let mode = "all";
let sinceDate = null;
let iconNames = null;
let diffVersion = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--since" && args[i + 1]) {
    mode = "since";
    sinceDate = new Date(args[i + 1]);
    i++;
  } else if (args[i] === "--names" && args[i + 1]) {
    mode = "names";
    iconNames = new Set(args[i + 1].split(",").map((n) => n.trim()));
    i++;
  } else if (args[i] === "--diff" && args[i + 1]) {
    mode = "diff";
    diffVersion = args[i + 1];
    i++;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`
Usage: node generate-json.js [options]

Options:
  --since <date>      Only icons created after this date (ISO format)
  --names <list>      Comma-separated kebab-case icon names
  --diff <version>    Icons added since a previous npm version
  -h, --help          Show this help

Examples:
  node generate-json.js                          # export all icons
  node generate-json.js --since 2025-03-01       # new icons since March 1st
  node generate-json.js --names sparkle,bolt     # just these two
  node generate-json.js --diff 1.1.170           # diff against older version
`);
    process.exit(0);
  }
}

// --- Resolve the package ---
let pkgRoot;
try {
  pkgRoot = path.dirname(require.resolve("@central-icons-react/all"));
} catch {
  // Fallback: look in cwd/node_modules
  const fallback = path.join(process.cwd(), "node_modules/@central-icons-react/all");
  if (fs.existsSync(path.join(fallback, "package.json"))) {
    pkgRoot = fallback;
  } else {
    console.error(
      "Error: @central-icons-react/all not found.\n" +
      "Run: npm install @central-icons-react/all"
    );
    process.exit(1);
  }
}

const iconsModule = fs.readFileSync(path.join(pkgRoot, "icons/index.mjs"), "utf-8");
const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf-8"));
console.log(`Package: ${pkgJson.name}@${pkgJson.version}`);

// --- Parse icon metadata ---
function parseMetadata() {
  const icons = {};
  const re = /(\w+):\{title:"([^"]+)",category:"([^"]+)",createdAt:"([^"]+)"\}/g;
  let m;
  while ((m = re.exec(iconsModule)) !== null) {
    const [, componentName, title, category, createdAt] = m;
    // Convert component name to kebab-case: IconArrowUp -> arrow-up
    const kebab = componentName
      .replace(/^Icon/, "")
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
      .toLowerCase()
      // Fix edge cases like "3d" which becomes "3-d"
      .replace(/(\d)-([a-z])/g, (_, d, l) => d + l);
    icons[componentName] = { kebab, title, category, createdAt };
  }
  return icons;
}

// --- Extract SVG for one icon ---
const VARIANT_ORDER = [
  { join: "square", filled: "outlined", radius: "0", stroke: "2" },
  { join: "square", filled: "filled", radius: "0", stroke: "2" },
  { join: "round", filled: "outlined", radius: "0", stroke: "2" },
  { join: "round", filled: "filled", radius: "0", stroke: "2" },
  { join: "round", filled: "outlined", radius: "1", stroke: "2" },
  { join: "round", filled: "filled", radius: "1", stroke: "2" },
  { join: "round", filled: "outlined", radius: "2", stroke: "2" },
  { join: "round", filled: "filled", radius: "2", stroke: "2" },
  { join: "round", filled: "outlined", radius: "3", stroke: "2" },
  { join: "round", filled: "filled", radius: "3", stroke: "2" },
  { join: "square", filled: "outlined", radius: "0", stroke: "1.5" },
  { join: "square", filled: "filled", radius: "0", stroke: "1.5" },
  { join: "round", filled: "outlined", radius: "0", stroke: "1.5" },
  { join: "round", filled: "filled", radius: "0", stroke: "1.5" },
  { join: "round", filled: "outlined", radius: "1", stroke: "1.5" },
  { join: "round", filled: "filled", radius: "1", stroke: "1.5" },
  { join: "round", filled: "outlined", radius: "2", stroke: "1.5" },
  { join: "round", filled: "filled", radius: "2", stroke: "1.5" },
  { join: "round", filled: "outlined", radius: "3", stroke: "1.5" },
  { join: "round", filled: "filled", radius: "3", stroke: "1.5" },
  { join: "square", filled: "outlined", radius: "0", stroke: "1" },
  { join: "square", filled: "filled", radius: "0", stroke: "1" },
  { join: "round", filled: "outlined", radius: "0", stroke: "1" },
  { join: "round", filled: "filled", radius: "0", stroke: "1" },
  { join: "round", filled: "outlined", radius: "1", stroke: "1" },
  { join: "round", filled: "filled", radius: "1", stroke: "1" },
  { join: "round", filled: "outlined", radius: "2", stroke: "1" },
  { join: "round", filled: "filled", radius: "2", stroke: "1" },
  { join: "round", filled: "outlined", radius: "3", stroke: "1" },
  { join: "round", filled: "filled", radius: "3", stroke: "1" },
];

function extractVariants(componentName) {
  const variants = {};
  for (const v of VARIANT_ORDER) {
    const pkgKey = `${v.join}-${v.filled}-radius-${v.radius}-stroke-${v.stroke}/${componentName}`;
    const figmaKey = `filled=${v.filled === "filled" ? "on" : "off"}, stroke=${v.stroke}, radius=${v.radius}, join=${v.join}`;

    const escaped = pkgKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`"${escaped}":'(.*?)'`);
    const match = iconsModule.match(re);
    if (match) {
      variants[figmaKey] = match[1];
    }
  }
  return variants;
}

// --- Diff mode: compare icon lists between versions ---
async function getIconListForVersion(version) {
  const { execSync } = require("child_process");
  const tmpDir = fs.mkdtempSync("/tmp/central-icons-diff-");
  try {
    execSync(`npm pack @central-icons-react/all@${version} --pack-destination ${tmpDir}`, {
      stdio: "pipe",
    });
    const tarball = fs.readdirSync(tmpDir).find((f) => f.endsWith(".tgz"));
    execSync(`tar -xzf ${path.join(tmpDir, tarball)} -C ${tmpDir}`, { stdio: "pipe" });
    const oldModule = fs.readFileSync(path.join(tmpDir, "package/icons/index.mjs"), "utf-8");
    const names = new Set();
    const re = /(\w+):\{title:/g;
    let m;
    while ((m = re.exec(oldModule)) !== null) names.add(m[1]);
    return names;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// --- Main ---
(async () => {
  const allIcons = parseMetadata();
  console.log(`Found ${Object.keys(allIcons).length} icons in package`);

  // Filter icons based on mode
  let selectedNames;

  if (mode === "all") {
    selectedNames = new Set(Object.keys(allIcons));
    console.log(`Mode: all — exporting all ${selectedNames.size} icons`);
  } else if (mode === "since") {
    selectedNames = new Set();
    for (const [name, meta] of Object.entries(allIcons)) {
      if (new Date(meta.createdAt) >= sinceDate) selectedNames.add(name);
    }
    console.log(`Mode: since ${sinceDate.toISOString().slice(0, 10)} — found ${selectedNames.size} icons`);
  } else if (mode === "names") {
    selectedNames = new Set();
    for (const [name, meta] of Object.entries(allIcons)) {
      if (iconNames.has(meta.kebab)) selectedNames.add(name);
    }
    const missing = [...iconNames].filter(
      (n) => !Object.values(allIcons).some((m) => m.kebab === n)
    );
    if (missing.length) console.warn(`Warning: not found in package: ${missing.join(", ")}`);
    console.log(`Mode: names — found ${selectedNames.size} of ${iconNames.size} requested`);
  } else if (mode === "diff") {
    console.log(`Mode: diff — comparing current (${pkgJson.version}) against ${diffVersion}...`);
    const oldNames = await getIconListForVersion(diffVersion);
    selectedNames = new Set();
    for (const name of Object.keys(allIcons)) {
      if (!oldNames.has(name)) selectedNames.add(name);
    }
    console.log(`Found ${selectedNames.size} new icons since v${diffVersion}`);
  }

  if (selectedNames.size === 0) {
    console.log("No icons to export.");
    process.exit(0);
  }

  // Build output grouped by category
  const output = {};
  let processed = 0;
  for (const componentName of selectedNames) {
    const meta = allIcons[componentName];
    if (!meta) continue;

    const variants = extractVariants(componentName);
    if (Object.keys(variants).length === 0) {
      console.warn(`  Warning: no SVG data found for ${meta.kebab}`);
      continue;
    }

    if (!output[meta.category]) output[meta.category] = {};
    output[meta.category][meta.kebab] = {
      title: meta.title,
      variants,
    };
    processed++;

    if (processed % 100 === 0) {
      process.stdout.write(`  ${processed}/${selectedNames.size} icons processed\r`);
    }
  }

  const outPath = path.join(process.cwd(), "icon-import.json");
  fs.writeFileSync(outPath, JSON.stringify(output));

  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  const catCount = Object.keys(output).length;
  console.log(`\nWrote ${outPath}`);
  console.log(`  ${processed} icons across ${catCount} categories (${sizeMB} MB)`);
  console.log(`\nTo import into Figma:`);
  console.log(`  1. npx serve -p 8765 --cors`);
  console.log(`  2. Open Figma, navigate to your Icons page`);
  console.log(`  3. Run the Central Icons Importer plugin`);
  console.log(`  4. Set URL to http://localhost:8765/icon-import.json`);
})();
