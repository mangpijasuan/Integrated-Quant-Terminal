const fs = require("fs");
const path = require("path");

const required = [
  "utils.ts",
  "api.ts",
  "use-api-cache.ts",
  "sidebar-context.tsx",
];

const sharedDir = path.join(__dirname, "..", "shared");
const missing = required.filter((file) => !fs.existsSync(path.join(sharedDir, file)));

if (missing.length > 0) {
  console.error("Missing frontend shared modules:");
  missing.forEach((file) => console.error(`  - frontend/shared/${file}`));
  console.error("");
  console.error("Fix: git pull origin main");
  console.error("If files are still missing, run: git checkout origin/main -- frontend/shared");
  process.exit(1);
}
