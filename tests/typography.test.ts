import { describe, expect, test } from "bun:test";
import { buildBrief, briefToMarkdown } from "../src/brief";
import {
  isSansFirstContext,
  resolveTypographyDirection,
  typographyAntiPatterns,
} from "../src/typography";

describe("typography guidance", () => {
  test("payment prompt is sans-first", () => {
    expect(isSansFirstContext("landing", "create a payment card")).toBe(true);
  });

  test("auth page type is sans-first", () => {
    expect(isSansFirstContext("auth", "OTP login")).toBe(true);
  });

  test("404 is not sans-first by default", () => {
    expect(isSansFirstContext("404", "creative radio 404")).toBe(false);
  });

  test("payment brief direction rejects serif headline", () => {
    const guidance = resolveTypographyDirection({
      pageType: "auth",
      productDescription: "create a payment card",
    });
    expect(guidance.isSansFirst).toBe(true);
    expect(guidance.fontPolicy).toBe("sans-product");
    expect(guidance.direction.toLowerCase()).toContain("sans");
    expect(guidance.avoid.some((a) => /fraunces|serif/i.test(a))).toBe(true);
  });

  test("pricing brief is sans-first", () => {
    const guidance = resolveTypographyDirection({
      pageType: "pricing",
      productDescription: "pricing card with annual toggle",
    });
    expect(guidance.isSansFirst).toBe(true);
    expect(guidance.direction.toLowerCase()).toContain("sans");
  });

  test("hero allows display voice", () => {
    const guidance = resolveTypographyDirection({
      pageType: "hero",
      productDescription: "launch hero for fintech",
    });
    expect(guidance.isSansFirst).toBe(false);
    expect(guidance.direction.toLowerCase()).toMatch(/display|grotesk|serif/);
  });

  test("typography anti-patterns merge into brief", () => {
    const guidance = resolveTypographyDirection({
      pageType: "auth",
      productDescription: "checkout card",
    });
    const brief = buildBrief({
      pageType: "auth",
      references: [],
      mode: "creative",
      productDescription: "checkout card",
    });
    const merged = [...brief.antiPatterns, ...typographyAntiPatterns(guidance)];
    expect(merged.some((a) => a.includes("Typography:"))).toBe(true);
  });

  test("brief markdown includes sans-first note for payment", () => {
    const brief = buildBrief({
      pageType: "auth",
      references: [],
      mode: "creative",
      productDescription: "create a payment card",
    });
    const md = briefToMarkdown(brief);
    expect(md).toContain("Sans-first task UI");
    expect(md).toContain("## Typography");
  });
});
