import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const PRODUCT_NAME = "Premium Taste";
export const CLI_NAME = "premium-taste";
export const LEGACY_CLI_NAME = "premiumref";
export const PRODUCT_VERSION = "1.0.0";
export const SKILL_REPO = "ayangabryl/premium-taste";
export const SKILL_NAME = "premium-taste";
export const SKILL_INSTALL_CMD = `npx skills add ${SKILL_REPO} --skill ${SKILL_NAME} -g -y`;

export const DEFAULT_BRIEF_DIR = ".premium-taste";
export const LEGACY_BRIEF_DIR = ".premiumref";
export const DEFAULT_BRIEF_PATH = `${DEFAULT_BRIEF_DIR}/brief.json`;
export const LEGACY_BRIEF_PATH = `${LEGACY_BRIEF_DIR}/brief.json`;

/** Prefer `.premium-taste`; fall back to legacy `.premiumref` if present. */
export function resolveDefaultBriefPath(cwd = process.cwd()): string {
  const primary = resolve(cwd, DEFAULT_BRIEF_PATH);
  if (existsSync(primary)) return primary;
  const legacy = resolve(cwd, LEGACY_BRIEF_PATH);
  if (existsSync(legacy)) return legacy;
  return primary;
}
