const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sharedDir = path.join(root, "shared");
const libDir = path.join(root, "lib");

const required = [
  "utils.ts",
  "api.ts",
  "use-api-cache.ts",
  "sidebar-context.tsx",
];

const missing = required.filter((file) => !fs.existsSync(path.join(sharedDir, file)));
if (missing.length > 0) {
  console.error("Missing frontend shared modules:");
  missing.forEach((file) => console.error(`  - frontend/shared/${file}`));
  console.error("\nRun: git pull origin main");
  process.exit(1);
}

fs.mkdirSync(libDir, { recursive: true });

for (const file of required) {
  const shim = path.join(libDir, file);
  if (!fs.existsSync(shim)) {
    const module = file.replace(/\.tsx?$/, "");
    fs.writeFileSync(shim, `export * from "../shared/${module}";\n`);
    console.log(`Created compatibility shim: frontend/lib/${file}`);
  }
}

let patched = 0;
for (const dir of ["app", "components"]) {
  walk(path.join(root, dir));
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    const text = fs.readFileSync(full, "utf8");
    if (!text.includes("@/lib/")) continue;
    fs.writeFileSync(full, text.replaceAll("@/lib/", "@/shared/"));
    console.log(`Patched imports: ${path.relative(root, full)}`);
    patched += 1;
  }
}

if (patched === 0) {
  console.log("Frontend modules OK");
}
