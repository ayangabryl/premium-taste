import { describe, expect, test } from "bun:test";
import { buildBrief, briefToMarkdown } from "../src/brief";
import { findReferences, loadReferences } from "../src/corpus";
import { getPageType, loadPageTypes, pickCreativeTechniques } from "../src/page-types";

describe("premiumref corpus", () => {
  test("loads references", () => {
    expect(loadReferences().length).toBeGreaterThan(3);
  });

  test("finds by id without bundled screenshot", () => {
    const refs = findReferences({ ids: ["iyo"] });
    expect(refs[0]?.name).toBe("iyO");
    expect(refs[0]?.screenshot).toBeUndefined();
  });
});

describe("premiumref page types", () => {
  test("loads page types including hero", () => {
    const types = loadPageTypes();
    expect(types.some((t) => t.id === "hero")).toBe(true);
  });

  test("hero profile has verify profile", () => {
    expect(getPageType("hero")?.verifyProfile).toBe("hero");
  });

  test("picks creative techniques for hero", () => {
    const techniques = pickCreativeTechniques("hero", 3);
    expect(techniques.length).toBe(3);
    expect(techniques.every((t) => t.applyTo.includes("hero"))).toBe(true);
  });
});

describe("premiumref brief", () => {
  test("reference mode with refs", () => {
    const refs = findReferences({ ids: ["follow-art"] });
    const brief = buildBrief({ pageType: "404", references: refs, mode: "reference" });
    expect(brief.mode).toBe("reference");
    expect(brief.references.length).toBe(1);
    expect(brief.version).toBe("0.6.1");
  });

  test("creative mode without refs for hero", () => {
    const brief = buildBrief({ pageType: "hero", references: [], mode: "creative" });
    expect(brief.mode).toBe("creative");
    expect(brief.references.length).toBe(0);
    expect(brief.craftPrinciples.length).toBe(3);
    expect(brief.phases.some((p) => p.id === "assets")).toBe(true);
  });

  test("creative markdown leads with discovery not techniques", () => {
    const brief = buildBrief({ pageType: "hero", references: [], mode: "creative" });
    const md = briefToMarkdown(brief);
    expect(md).toContain("Designer-first");
    expect(md).toContain("Product discovery");
    expect(md).toContain("Craft principles");
    expect(md).not.toContain("Taste steal list");
  });

  test("merges DESIGN.md when path provided", () => {
    const brief = buildBrief({
      pageType: "hero",
      references: [],
      mode: "creative",
      designMdPath: "docs/DESIGN-TEMPLATE.md",
    });
    expect(brief.designMd).toContain("DESIGN.md");
  });

  test("auth brief requires discovery before concept", () => {
    const brief = buildBrief({
      pageType: "auth",
      references: [],
      mode: "creative",
      productDescription: "OTP authentication code entry",
    });
    expect(brief.version).toBe("0.6.1");
    expect(brief.discoveryQuestions.length).toBeGreaterThan(4);
    expect(brief.concept).toContain("AGENT");
    const md = briefToMarkdown(brief);
    expect(md).toContain("Product discovery");
    expect(md).toContain("Originality test");
    expect(md).not.toContain("Taste steal list");
  });
});
