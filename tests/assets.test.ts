import { describe, expect, test } from "bun:test";
import { auditEmDashCopy, buildUnsplashCdnUrl, resolveAssetPlan } from "../src/assets";
import { buildBrief, briefToMarkdown } from "../src/brief";

describe("premiumref assets", () => {
  test("resolves key icon metaphor for password reset product", () => {
    const plan = resolveAssetPlan({
      pageType: "auth",
      productDescription: "password reset with email link",
    });
    expect(plan.icons.some((i) => i.id === "key")).toBe(true);
    expect(plan.lottie.length).toBeGreaterThan(0);
  });

  test("includes envelope for email-heavy auth", () => {
    const plan = resolveAssetPlan({
      pageType: "auth",
      productDescription: "send magic link to inbox",
    });
    expect(plan.icons.some((i) => i.id === "envelope" || i.id === "key")).toBe(true);
  });

  test("resolves production images for computer mouse", () => {
    const plan = resolveAssetPlan({
      pageType: "hero",
      productDescription: "premium wireless computer mouse product landing",
    });
    expect(plan.productionImages.length).toBeGreaterThan(0);
    expect(plan.productionImages[0]?.cdnUrl).toContain("images.unsplash.com");
    expect(plan.productionImages.some((i) => i.role === "hero")).toBe(true);
  });

  test("buildUnsplashCdnUrl uses corpus template", () => {
    const url = buildUnsplashCdnUrl("photo-1772531606450-0dd023c265d7", { width: 1600 });
    expect(url).toContain("photo-1772531606450-0dd023c265d7");
    expect(url).toContain("w=1600");
  });

  test("brief embeds asset plan and copy voice", () => {
    const brief = buildBrief({
      pageType: "auth",
      references: [],
      mode: "creative",
      productDescription: "password reset",
    });
    expect(brief.version).toBe("0.6.1");
    expect(brief.assetPlan?.icons.length).toBeGreaterThan(0);
    expect(brief.copyVoiceRules?.length).toBeGreaterThan(2);
    const md = briefToMarkdown(brief);
    expect(md).toContain("Asset plan (auto-resolved)");
    expect(md).toContain("Copy voice");
    expect(md).toContain("Icon metaphors");
  });
});

describe("premiumref copy voice", () => {
  test("flags em-dash brochure rhythm", () => {
    const bad = auditEmDashCopy("Build faster — ship smarter — scale infinitely");
    expect(bad.flagged).toBe(true);
    expect(bad.evidence.length).toBeGreaterThan(0);
  });

  test("flags single em dash in UI copy", () => {
    const one = auditEmDashCopy("Link sent — check inbox");
    expect(one.flagged).toBe(true);
  });

  test("passes period-separated copy", () => {
    const ok = auditEmDashCopy("Link sent. Check inbox.");
    expect(ok.flagged).toBe(false);
  });
});
