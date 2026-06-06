import { spawn } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env.js";
import type { LeanBacktestResultFile, LeanRuntimeStatus } from "./types.js";

function getLeanPathEnv(): NodeJS.ProcessEnv {
  const localBin = path.join(process.env.HOME ?? "", ".local", "bin");
  return {
    ...process.env,
    PATH: `${localBin}:${process.env.PATH ?? ""}`,
  };
}

type RunBacktestOptions = {
  project: string;
  outputDir: string;
  parameters?: Record<string, string>;
};

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("which", [command], { stdio: "ignore", env: getLeanPathEnv() });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

export async function discoverLeanProjects(leanRoot: string): Promise<string[]> {
  const entries = await readdir(leanRoot, { withFileTypes: true });
  const projects: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (["data", "backtests", "storage"].includes(entry.name)) {
      continue;
    }

    const hasPython = await pathExists(path.join(leanRoot, entry.name, "main.py"));
    const hasCSharp = await pathExists(path.join(leanRoot, entry.name, "Main.cs"));

    if (hasPython || hasCSharp) {
      projects.push(entry.name);
    }
  }

  return projects.sort();
}

export async function getLeanRuntimeStatus(): Promise<LeanRuntimeStatus> {
  const leanRoot = path.resolve(env.LEAN_ROOT);
  const leanCliPath = env.LEAN_CLI_PATH;
  const issues: string[] = [];

  if (!(await pathExists(leanRoot))) {
    issues.push(`Lean workspace not found at ${leanRoot}. Run scripts/setup-lean.sh.`);
  }

  if (!(await pathExists(path.join(leanRoot, "lean.json")))) {
    issues.push("lean/lean.json is missing. Run scripts/setup-lean.sh.");
  }

  if (!(await pathExists(path.join(leanRoot, "data")))) {
    issues.push("lean/data is missing. Run scripts/setup-lean.sh.");
  }

  if (!(await commandExists(leanCliPath))) {
    issues.push(`Lean CLI not found (${leanCliPath}). Install with: pip install lean`);
  }

  if (!(await commandExists("docker"))) {
    issues.push("Docker is required for local Lean backtests.");
  }

  let projects: string[] = [];
  if (issues.length === 0 || (await pathExists(leanRoot))) {
    try {
      projects = await discoverLeanProjects(leanRoot);
    } catch {
      issues.push("Unable to scan Lean projects.");
    }
  }

  if (projects.length === 0) {
    issues.push("No Lean projects found. Create one with: lean project-create \"MyStrategy\" --language python");
  }

  return {
    ready: issues.length === 0,
    leanRoot,
    leanCliPath,
    issues,
    projects,
  };
}

export async function runLeanBacktest(options: RunBacktestOptions): Promise<void> {
  const leanRoot = path.resolve(env.LEAN_ROOT);
  const args = ["backtest", options.project, "--output", options.outputDir];

  for (const [name, value] of Object.entries(options.parameters ?? {})) {
    args.push("--parameter", name, value);
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(env.LEAN_CLI_PATH, args, {
      cwd: leanRoot,
      env: getLeanPathEnv(),
    });

    let stderr = "";

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const error = new Error(stderr.trim() || `Lean backtest failed with exit code ${code}`);
      reject(error);
    });
  });
}

export async function readLeanBacktestSummary(outputDir: string) {
  const files = await readdir(outputDir);
  const resultFiles = files.filter((file) => file.endsWith(".json"));

  if (resultFiles.length === 0) {
    throw new Error("Lean backtest completed but no JSON result file was found.");
  }

  const contents = await Promise.all(
    resultFiles.map(async (file) => {
      const raw = await readFile(path.join(outputDir, file), "utf8");
      return JSON.parse(raw) as LeanBacktestResultFile;
    }),
  );

  const result = contents.find((entry) => entry.Statistics) ?? contents[0];
  if (!result) {
    throw new Error("Lean backtest completed but result JSON could not be parsed.");
  }

  return {
    statistics: result.Statistics ?? {},
    runtimeStatistics: result.RuntimeStatistics ?? {},
    raw: result,
  };
}
