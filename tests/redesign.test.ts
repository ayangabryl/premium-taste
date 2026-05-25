import { describe, expect, test } from "bun:test";
import { buildBrief, briefToMarkdown } from "../src/brief";
import {
  applyRedesignEnrichment,
  isRedesignRequest,
  redesignFitConstraints,
  resolveRedesignWorkflow,
} from "../src/redesign";

describe("redesign workflow", () => {
  test("detects redesign with photo", () => {
    expect(isRedesignRequest("redesign this hero with a photo")).toBe(true);
    expect(isRedesignRequest("create pricing cards")).toBe(false);
  });

  test("expands redesign product description", () => {
    const out = applyRedesignEnrichment("redesign the pricing section with this photo");
    expect(out).toContain("preserve routes");
    expect(out).toContain("edit the real files");
  });

  test("redesign workflow includes locate and photo steps", () => {
    const wf = resolveRedesignWorkflow("redesign this page");
    expect(wf.detected).toBe(true);
    expect(wf.locateTarget.some((s) => s.includes("grep"))).toBe(true);
    expect(wf.photoHandling.some((s) => s.toLowerCase().includes("photo"))).toBe(true);
  });

  test("fit constraints for redesign", () => {
    expect(redesignFitConstraints().some((c) => c.includes("duplicate"))).toBe(true);
  });

  test("brief includes redesign section", () => {
    const brief = buildBrief({
      pageType: "landing",
      references: [],
      mode: "creative",
      productDescription: "redesign the about page with a photo",
    });
    expect(brief.redesign?.detected).toBe(true);
    const md = briefToMarkdown(brief);
    expect(md).toContain("Redesign workflow");
    expect(md).toContain("Locate target");
    expect(md).toContain("Photo / image");
  });
});
