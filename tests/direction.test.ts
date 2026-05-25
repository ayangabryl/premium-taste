import { describe, expect, test } from "bun:test";
import { inferDirection } from "../src/direction";
import { loadDiscoveryQuestions } from "../src/discovery";

describe("premiumref direction (designer-first)", () => {
  test("loads discovery questions for auth", () => {
    const qs = loadDiscoveryQuestions("auth");
    expect(qs.some((q) => q.id === "user-moment")).toBe(true);
    expect(qs.some((q) => q.id === "trust-speed")).toBe(true);
  });

  test("auth direction is product-fit not aesthetic preset", () => {
    const d = inferDirection({
      pageType: "auth",
      productDescription: "Enter authentication code from authenticator app",
    });
    expect(d.reason).toContain("Designer-first");
    expect(d.fitConstraints.some((c) => c.toLowerCase().includes("paste"))).toBe(true);
    expect(d.craftPrinciples.length).toBe(3);
    expect(d.avoidSimilarTo.some((a) => a.toLowerCase().includes("static") || a.toLowerCase().includes("demo"))).toBe(
      true,
    );
  });

  test("portfolio adds similarity awareness when refs named", () => {
    const d = inferDirection({
      pageType: "portfolio",
      referenceNames: ["Follow.Art", "iyO"],
    });
    expect(d.avoidSimilarTo.some((a) => a.includes("Follow.Art") || a.includes("Orange"))).toBe(true);
  });

  test("falls back to page scoring profile without prescribing look", () => {
    const d = inferDirection({ pageType: "hero" });
    expect(d.scoringProfile.id).toBeTruthy();
    expect(d.discoveryQuestions.length).toBeGreaterThan(3);
    expect(d.craftPrinciples.length).toBe(3);
  });

  test("taste override only affects scoring profile", () => {
    const d = inferDirection({ pageType: "auth", tasteOverride: "minimal" });
    expect(d.scoringProfile.id).toBe("minimal");
    expect(d.fitConstraints.length).toBeGreaterThan(0);
  });
});
