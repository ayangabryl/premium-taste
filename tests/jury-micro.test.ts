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
    interactiveControls: 4,
    hoverTargets: 1,
    pointerCustomized: false,
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
    contrastOk: false,
    containedMaterial: true,
    score: 3,
    maxScore: 5,
    evidence: [],
  },
  passed: true,
  agentNextSteps: [],
  verifyProfile: "editorial" as const,
  taste: "editorial",
};

const solidOk = {
  scrubPresent: false,
  dragChangesValue: false,
  keyboardWorks: false,
  pointerCapture: false,
  restBehavior: false,
  score: 2,
  maxScore: 5,
  evidence: [],
};

const cleanSenior = {
  slideScrubGimmick: false,
  editorialStepTemplate: false,
  taskPageType: false,
  liftHover: false,
  rowSlideHover: false,
  numberFlowMissing: false,
  planCardLayoutIssues: false,
  headerTopCramped: false,
  toggleFlushToHeader: false,
  billingOrderWrong: false,
  notes: ["NumberFlow present on price — good micro craft"],
};

describe("jury micro craft penalties", () => {
  test("lift hover lowers score vs clean micro", () => {
    const withLift = buildJuryReport("http://test", baseVerify, solidOk, undefined, {
      ...cleanSenior,
      liftHover: true,
      notes: ["Senior: translateY lift on hover"],
    });

    const clean = buildJuryReport("http://test", baseVerify, solidOk, undefined, cleanSenior);

    expect(withLift.total).toBeLessThan(clean.total);
  });

  test("missing NumberFlow on pricing penalizes interaction notes", () => {
    const report = buildJuryReport("http://test", baseVerify, solidOk, undefined, {
      ...cleanSenior,
      numberFlowMissing: true,
      notes: ["Senior: billing toggle without NumberFlow"],
    });

    const interaction = report.dimensions.find((d) => d.id === "interaction")!;
    expect(interaction.notes.some((n) => n.includes("NumberFlow"))).toBe(true);
    expect(report.total).toBeLessThan(JURY_THRESHOLDS.exceptional);
  });
});

describe("jury plan-card layout penalties", () => {
  test("cramped header + flush toggle lowers layout score", () => {
    const bad = buildJuryReport("http://test", baseVerify, solidOk, undefined, {
      ...cleanSenior,
      planCardLayoutIssues: true,
      headerTopCramped: true,
      toggleFlushToHeader: true,
      notes: [
        "Senior: tier title cramped to header top (8px inset — need breathing room)",
        "Senior: billing toggle flush to card body top — add top padding or gap after header band",
      ],
    });

    const clean = buildJuryReport("http://test", baseVerify, solidOk, undefined, cleanSenior);

    const badLayout = bad.dimensions.find((d) => d.id === "layout")!;
    expect(badLayout.notes.some((n) => n.includes("cramped") || n.includes("flush"))).toBe(true);
    expect(bad.total).toBeLessThan(clean.total);
  });

  test("annual-before-monthly order penalizes layout on plan cards", () => {
    const report = buildJuryReport("http://test", baseVerify, solidOk, undefined, {
      ...cleanSenior,
      planCardLayoutIssues: true,
      billingOrderWrong: true,
      notes: ["Senior: plan card billing order — Monthly before Annual reads natural"],
    });

    const layout = report.dimensions.find((d) => d.id === "layout")!;
    expect(layout.notes.some((n) => n.includes("billing order"))).toBe(true);
    expect(report.agentNextSteps.some((s) => s.includes("plan-card layout"))).toBe(true);
  });
});
