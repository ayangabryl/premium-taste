import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  DEFAULT_BRIEF_PATH,
  productDescriptionFromBrief,
  resolveRunContext,
} from "../src/brief-context";
import type { CreativeBrief } from "../src/types";

const sampleBrief: CreativeBrief = {
  version: "0.6.1",
  generatedAt: new Date().toISOString(),
  mode: "creative",
  taste: "spectacle",
  pageType: "pricing",
  pageTypeProfile: {
    id: "pricing",
    label: "Premium pricing section",
    goal: "Plans",
    conceptQuestions: [],
    requiredElements: [],
    layoutPatterns: [],
    techniqueIds: [],
    interactionDefaults: [],
    antiPatterns: [],
    verifyProfile: "creative",
  },
  goal: "pricing card",
  references: [],
  techniques: [],
  craftPrinciples: [],
  discoveryQuestions: [],
  fitConstraints: [],
  originalityTest: "",
  avoidSimilarTo: [],
  concept: "",
  typographyDirection: "",
  motionSpec: {
    required: true,
    plugins: [],
    timelineNotes: [],
    reducedMotionFallback: "",
    performanceRules: [],
  },
  interactionRequirements: [],
  phases: [],
  rubricDimensions: [],
  antiPatterns: [],
  qualityGate: "",
  referenceStudy: [],
  productDescription: "create me a pricing card",
  enrichedProductDescription: "create me a pricing card — expanded",
  productEnriched: true,
};

describe("resolveRunContext", () => {
  let dir: string;
  let briefPath: string;

  test("exports default brief path", () => {
    expect(DEFAULT_BRIEF_PATH).toBe(".premium-taste/brief.json");
  });

  test("productDescriptionFromBrief prefers productDescription field", () => {
    expect(productDescriptionFromBrief(sampleBrief)).toBe("create me a pricing card");
  });

  test("loads page type and product from brief when CLI omits flags", () => {
    dir = join(tmpdir(), `premiumref-brief-ctx-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    briefPath = join(dir, "brief.json");
    writeFileSync(briefPath, JSON.stringify(sampleBrief));

    const ctx = resolveRunContext({ briefPath, noBrief: false });
    expect(ctx.briefLoaded).toBe(true);
    expect(ctx.pageType).toBe("pricing");
    expect(ctx.productDescription).toBe("create me a pricing card");
    expect(ctx.tasteId).toBe("spectacle");
    expect(ctx.verifyProfile).toBe("creative");
    expect(ctx.cliOverrides).toEqual([]);

    rmSync(dir, { recursive: true, force: true });
  });

  test("CLI flags override brief context", () => {
    dir = join(tmpdir(), `premiumref-brief-ctx-${Date.now()}-2`);
    mkdirSync(dir, { recursive: true });
    briefPath = join(dir, "brief.json");
    writeFileSync(briefPath, JSON.stringify(sampleBrief));

    const ctx = resolveRunContext({
      briefPath,
      pageType: "auth",
      productDescription: "OTP login",
      taste: "editorial",
    });

    expect(ctx.pageType).toBe("auth");
    expect(ctx.productDescription).toBe("OTP login");
    expect(ctx.tasteId).toBe("editorial");
    expect(ctx.cliOverrides).toContain("pageType");
    expect(ctx.cliOverrides).toContain("productDescription");
    expect(ctx.cliOverrides).toContain("taste");

    rmSync(dir, { recursive: true, force: true });
  });

  test("no brief falls back to cli defaults", () => {
    const ctx = resolveRunContext({
      noBrief: true,
      pageType: "404",
    });
    expect(ctx.briefLoaded).toBe(false);
    expect(ctx.briefPath).toBe(null);
    expect(ctx.pageType).toBe("404");
  });
});
