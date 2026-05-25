import { describe, expect, test } from "bun:test";
import { buildBrief } from "../src/brief";
import { getPageType } from "../src/page-types";
import { getTaste, loadTastes, resolveTaste, pickTechniquesForTaste } from "../src/tastes";

describe("premiumref tastes", () => {
  test("loads taste lanes including blueprint", () => {
    const tastes = loadTastes();
    expect(tastes.length).toBeGreaterThanOrEqual(5);
    expect(tastes.map((t) => t.id)).toContain("editorial");
  });

  test("portfolio defaults to editorial taste", () => {
    const taste = resolveTaste(undefined, "portfolio");
    expect(taste.id).toBe("editorial");
  });

  test("hero defaults to spectacle", () => {
    const taste = resolveTaste(undefined, "hero");
    expect(taste.id).toBe("spectacle");
  });

  test("explicit taste overrides page default", () => {
    expect(resolveTaste("minimal", "hero").id).toBe("minimal");
  });

  test("editorial override sets scoring profile only", () => {
    const brief = buildBrief({ pageType: "portfolio", references: [], mode: "creative", taste: "editorial" });
    expect(brief.taste).toBe("editorial");
    expect(brief.typographyDirection.toLowerCase()).toContain("system");
    expect(brief.motionSpec.required).toBe(false);
    expect(brief.craftPrinciples.length).toBe(3);
  });

  test("spectacle brief requires GSAP", () => {
    const brief = buildBrief({ pageType: "hero", references: [], mode: "creative", taste: "spectacle" });
    expect(brief.motionSpec.required).toBe(true);
  });

  test("portfolio page type exists with editorial verify", () => {
    const p = getPageType("portfolio");
    expect(p?.defaultTaste).toBe("editorial");
    expect(p?.verifyProfile).toBe("editorial");
  });

  test("pickTechniquesForTaste prefers taste techniques", () => {
    const taste = getTaste("editorial")!;
    const techniques = pickTechniquesForTaste("portfolio", taste, 3);
    expect(techniques.length).toBe(3);
    expect(techniques.every((t) => taste.techniqueIds.includes(t.id) || t.applyTo.includes("portfolio"))).toBe(true);
  });
});
