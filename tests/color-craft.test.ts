import { describe, expect, test } from "bun:test";
import { enrichProductRequest, isVagueProductRequest, resolveColorGuidance } from "../src/color-craft";
import { buildBrief, briefToMarkdown } from "../src/brief";

describe("color craft", () => {
  test("detects vague pricing prompt", () => {
    expect(isVagueProductRequest("create me pricing cards")).toBe(true);
    expect(isVagueProductRequest("Premium Plus tier — mesh header, warm gray meta, Framer restraint")).toBe(false);
  });

  test("expands vague pricing into senior direction", () => {
    const enriched = enrichProductRequest({
      pageType: "landing",
      productDescription: "create me pricing cards",
    });
    expect(enriched.wasVague).toBe(true);
    expect(enriched.inferredPageType).toBe("pricing");
    expect(enriched.productDescription).toContain("mesh");
    expect(enriched.productDescription).toContain("Framer");
    expect(enriched.colorGuidance.pattern.label).toContain("pricing");
  });

  test("pricing color guidance includes semantic tokens", () => {
    const guidance = resolveColorGuidance("pricing");
    expect(guidance.semanticTokens.cssTemplate).toContain("--surface");
    expect(guidance.pattern.do.some((d) => d.toLowerCase().includes("price"))).toBe(true);
  });
});

describe("brief color + vague enrichment", () => {
  test("brief auto-expands vague pricing request", () => {
    const brief = buildBrief({
      pageType: "landing",
      references: [],
      mode: "creative",
      productDescription: "create me pricing cards",
    });
    expect(brief.pageType).toBe("pricing");
    expect(brief.productEnriched).toBe(true);
    expect(brief.colorGuidance?.label).toContain("pricing");
    expect(brief.microInteractions?.proactiveSuggestions.some((s) => s.includes("NumberFlow"))).toBe(true);
    const md = briefToMarkdown(brief);
    expect(md).toContain("Senior micro — Premium Taste suggests this");
    expect(md).toContain("NumberFlow");
    expect(md).toContain("Premium prompt (auto-expanded");
    expect(md).toContain("Color & material (premium craft)");
    expect(md).toContain("--surface");
  });
});
