import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { CLI_NAME, PRODUCT_NAME, SKILL_NAME, SKILL_REPO } from "./constants";

const PROVIDER_DIRS = [
  ".agents",
  ".claude",
  ".cursor",
  ".codex",
  ".github",
  ".gemini",
  ".opencode",
];

function findProjectRoot(cwd = process.cwd()): string {
  let dir = cwd;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, ".git"))) return dir;
    dir = dirname(dir);
  }
  return cwd;
}

function isSkillInstalled(root: string): boolean {
  for (const d of PROVIDER_DIRS) {
    if (existsSync(join(root, d, "skills", SKILL_NAME, "SKILL.md"))) return true;
  }
  return existsSync(join(homedir(), ".agents", "skills", SKILL_NAME, "SKILL.md"));
}

function runSkillsAdd(yes: boolean): void {
  execSync(`npx skills add ${SKILL_REPO} --copy${yes ? " -y" : ""}`, { stdio: "inherit" });
}

export function cmdSkillsHelp(): number {
  console.log(`${PRODUCT_NAME} skills

  skills install [--force] [-y]   Install agent skill into this project
  skills update [-y]              Reinstall latest skill
  skills help                     Show this help

Quick start:
  npx ${CLI_NAME} skills install
  npx ${CLI_NAME} design -p "pricing card with annual toggle"
`);
  return 0;
}

export function cmdSkills(args: string[]): number {
  const sub = args[0];

  if (!sub || sub === "help" || sub === "--help" || sub === "-h") {
    return cmdSkillsHelp();
  }

  if (sub === "install" || sub === "update") {
    const force = args.includes("--force") || sub === "update";
    const yes = args.includes("-y") || args.includes("--yes") || sub === "update";
    const root = findProjectRoot();

    if (isSkillInstalled(root) && !force) {
      console.log(`${PRODUCT_NAME} skill already installed.`);
      console.log("Run `npx premium-taste skills update` to refresh.\n");
      return 0;
    }

    console.log(`Installing ${SKILL_NAME} via npx skills...\n`);
    try {
      runSkillsAdd(yes);
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err && "status" in err ? (err as { status?: number }).status : 1;
      return status ?? 1;
    }

    console.log("");
    console.log(`Done! Use /${SKILL_NAME} or say "premium taste pricing card".`);
    console.log(`Score builds: npx ${CLI_NAME} design -p "..." --url <url> --skip-brief`);
    console.log("First verify/jury run: npx playwright install chromium\n");
    return 0;
  }

  console.error(`Unknown skills command: ${sub}`);
  console.error(`Run 'npx ${CLI_NAME} skills help' for available commands.`);
  return 1;
}
