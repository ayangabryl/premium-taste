import { describe, expect, test } from "bun:test";
import { buildJuryReport, JURY_THRESHOLDS } from "../src/jury";

const baseVerify = {
  motion: {
    gsapPresent: true,
    animatedElements: 2,
    entranceSequenced: true,
    prefersReducedMotionHandled: true,
    reducedMotionSimulated: true,
    evidence: [],
  },
  interaction: {
    interactiveControls: 2,
    hoverTargets: 1,
    pointerCustomized: true,
    pointerAffectsVisual: true,
    evidence: [],
  },
  visual: {
    displayTypeScale: true,
    customTypography: true,
    customAssets: true,
    editorialLayout: true,
    score: 4,
    maxScore: 4,
    evidence: [],
  },
  slop: { clean: true, flags: 0, evidence: [] },
  color: {
    semanticTokens: true,
    mutedHierarchy: true,
    contrastOk: true,
    containedMaterial: true,
    score: 5,
    maxScore: 5,
    evidence: [],
  },
  passed: true,
  agentNextSteps: [],
  verifyProfile: "hero" as const,
  taste: "spectacle",
};

const solidOk = {
  scrubPresent: true,
  dragChangesValue: true,
  keyboardWorks: true,
  pointerCapture: true,
  restBehavior: true,
  score: 5,
  maxScore: 5,
  evidence: ["Scrub surface present", "Drag changes scrub value"],
};

describe("premiumref jury", () => {
  test("buildJuryReport scores solid interaction highly", () => {
    const report = buildJuryReport("http://127.0.0.1:8765/hero", baseVerify, solidOk);
    expect(report.total).toBeGreaterThanOrEqual(JURY_THRESHOLDS.ship);
    expect(report.solidInteraction.dragChangesValue).toBe(true);
    expect(report.dimensions.some((d) => d.id === "interaction")).toBe(true);
  });

  test("broken drag caps interaction score", () => {
    const report = buildJuryReport("http://test", baseVerify, {
      ...solidOk,
      dragChangesValue: false,
      score: 2,
      evidence: ["Drag did NOT change scrub value"],
    });
    const interaction = report.dimensions.find((d) => d.id === "interaction")!;
    expect(interaction.score).toBeLessThanOrEqual(3.3);
    expect(report.total).toBeLessThan(JURY_THRESHOLDS.exceptional);
  });

  test("verdict tiers match thresholds", () => {
    const ship = buildJuryReport("http://test", baseVerify, solidOk);
    expect(["ship", "exceptional"]).toContain(ship.verdict);

    const weak = buildJuryReport(
      "http://test",
      {
        ...baseVerify,
        passed: false,
        motion: {
          ...baseVerify.motion,
          gsapPresent: false,
          animatedElements: 0,
          reducedMotionSimulated: false,
        },
        visual: {
          ...baseVerify.visual,
          displayTypeScale: false,
          customTypography: false,
          customAssets: false,
          editorialLayout: false,
          score: 0,
        },
        slop: { clean: false, flags: 3, evidence: ["pill CTA"] },
        color: {
          semanticTokens: false,
          mutedHierarchy: false,
          contrastOk: false,
          containedMaterial: false,
          score: 0,
          maxScore: 5,
          evidence: ["Low contrast"],
        },
      },
      {
        scrubPresent: false,
        dragChangesValue: false,
        keyboardWorks: false,
        pointerCapture: false,
        restBehavior: false,
        score: 0,
        maxScore: 5,
        evidence: [],
      },
    );
    expect(weak.total).toBeLessThan(60);
    expect(weak.verdict).toBe("reject");
  });

  test("slide scrub gimmick on auth is penalized", () => {
    const report = buildJuryReport(
      "http://test",
      { ...baseVerify, verifyProfile: "editorial" as const, taste: "editorial" },
      solidOk,
      undefined,
      {
        slideScrubGimmick: true,
        editorialStepTemplate: false,
        taskPageType: true,
        notes: ["Senior: slide-to-send on auth/reset is gimmick — not product-native"],
      },
    );
    expect(report.total).toBeLessThan(JURY_THRESHOLDS.exceptional);
    expect(report.seniorAudit?.length).toBe(1);
  });
});
