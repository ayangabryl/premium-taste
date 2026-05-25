import { describe, expect, test } from "bun:test";
import { SKILL_INSTALL_CMD } from "../src/constants";
import { cmdSkillsHelp } from "../src/skills";

describe("premium-taste skills", () => {
  test("skills help mentions npx skills add install", () => {
    const lines: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      expect(cmdSkillsHelp()).toBe(0);
    } finally {
      console.log = orig;
    }
    const out = lines.join("\n");
    expect(out).toContain("npx skills add");
    expect(out).toContain(SKILL_INSTALL_CMD);
  });
});
