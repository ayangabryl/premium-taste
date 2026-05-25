import { describe, expect, test } from "bun:test";
import { cmdSkillsHelp } from "../src/skills";

describe("premium-taste skills", () => {
  test("skills help mentions install", () => {
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
    expect(out).toContain("skills install");
    expect(out).toContain("npx premium-taste skills install");
  });
});
