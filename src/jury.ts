import type { CreativeTaste, JuryDimensionScore, JuryReport, JurySolidInteraction } from "./types";
import { getBrowser } from "./verify";
import { juryWeightsForTaste, resolveTaste } from "./tastes";

export const JURY_THRESHOLDS = {
  ship: 75,
  exceptional: 85,
};

export const JURY_DIMENSIONS: { id: string; title: string; weight: number }[] = [
  { id: "interaction", title: "Interaction craft", weight: 25 },
  { id: "typography", title: "Typography", weight: 15 },
  { id: "colorMaterial", title: "Color & material", weight: 20 },
  { id: "motion", title: "Motion", weight: 15 },
  { id: "layout", title: "Layout & composition", weight: 15 },
  { id: "concept", title: "Concept clarity", weight: 10 },
];

export async function verifySolidInteraction(page: import("playwright").Page): Promise<JurySolidInteraction> {
  const evidence: string[] = [];
  let score = 0;
  const maxScore = 5;

  const surface = await page.$('[role="slider"], [data-solid-scrub], .split-hero');
  if (!surface) {
    return {
      scrubPresent: false,
      dragChangesValue: false,
      keyboardWorks: false,
      pointerCapture: false,
      restBehavior: false,
      score: 0,
      maxScore,
      evidence: ["No scrub surface ([role=slider] or data-solid-scrub)"],
    };
  }

  score += 1;
  evidence.push("Scrub surface present");

  const readState = () =>
    page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        split: root.getPropertyValue("--split").trim(),
        clip: root.getPropertyValue("--clip").trim(),
        aria: document.querySelector('[role="slider"]')?.getAttribute("aria-valuenow"),
      };
    });

  const before = await readState();
  const box = await surface.boundingBox();
  let dragChangesValue = false;

  if (box) {
    const midY = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.25, midY);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, midY, { steps: 10 });
    await page.waitForTimeout(80);
    const duringDrag = await readState();
    await page.mouse.up();
    await page.waitForTimeout(80);

    dragChangesValue =
      before.split !== duringDrag.split ||
      before.clip !== duringDrag.clip ||
      before.aria !== duringDrag.aria;
  }

  if (dragChangesValue) {
    score += 1;
    evidence.push("Drag changes scrub value");
  } else {
    evidence.push("Drag did NOT change scrub value — interaction broken");
  }

  await surface.focus();
  const ariaBeforeKey = (await readState()).aria;
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(180);
  const afterKey = await page.evaluate(
    () => document.querySelector('[role="slider"]')?.getAttribute("aria-valuenow"),
  );
  const keyboardWorks = ariaBeforeKey !== afterKey;

  if (keyboardWorks) {
    score += 1;
    evidence.push("Keyboard arrow changes value");
  } else {
    evidence.push("Keyboard scrub not working");
  }

  const pointerCapture = await page.evaluate(() => !!document.querySelector("[data-solid-scrub]"));
  if (pointerCapture) {
    score += 1;
    evidence.push("Solid scrub module (data-solid-scrub)");
  }

  score += 1;
  evidence.push("Rest state readable after interaction");

  return {
    scrubPresent: true,
    dragChangesValue,
    keyboardWorks,
    pointerCapture,
    restBehavior: true,
    score,
    maxScore,
    evidence,
  };
}

function scoreDimension(
  id: string,
  raw: number,
  max: number,
  notes: string[],
  weights: { id: string; title: string; weight: number }[],
): JuryDimensionScore {
  const dim = weights.find((d) => d.id === id) ?? JURY_DIMENSIONS.find((d) => d.id === id)!;
  const score = Math.round((raw / max) * 10 * 10) / 10;
  return {
    id,
    title: dim.title,
    weight: dim.weight,
    score,
    max: 10,
    weighted: Math.round((score / 10) * dim.weight * 10) / 10,
    notes,
  };
}

export type SeniorAudit = {
  slideScrubGimmick: boolean;
  editorialStepTemplate: boolean;
  taskPageType: boolean;
  liftHover: boolean;
  rowSlideHover: boolean;
  numberFlowMissing: boolean;
  planCardLayoutIssues: boolean;
  headerTopCramped: boolean;
  toggleFlushToHeader: boolean;
  billingOrderWrong: boolean;
  notes: string[];
};

const TASK_PAGE_TYPES = new Set(["auth", "empty-state"]);

export async function auditSeniorCraft(
  page: import("playwright").Page,
  pageType?: string,
): Promise<SeniorAudit> {
  const { auditMicroCraft } = await import("./verify-micro-craft");
  const { auditPricingLayout } = await import("./verify-pricing-layout");
  const signals = await page.evaluate(() => ({
    slideScrubGimmick: !!document.querySelector('[role="slider"], [data-solid-scrub], .send-scrub, .send-scrub-wrap'),
    editorialStepTemplate:
      document.querySelectorAll("ol.steps li, .steps .row, li.row").length >= 3 &&
      !!document.querySelector("[data-preview], .hover-card"),
  }));

  const micro = await auditMicroCraft(page, pageType);
  const layout = await auditPricingLayout(page, pageType);
  const taskPageType = TASK_PAGE_TYPES.has(pageType ?? "");
  const notes: string[] = [...micro.notes, ...layout.notes];

  if (signals.slideScrubGimmick && taskPageType) {
    notes.push("Senior: slide-to-send on auth/reset is gimmick — not product-native");
  }
  if (signals.editorialStepTemplate) {
    notes.push("Senior: 3-step list + hover preview reads as editorial template");
  }

  const planCardLayoutIssues =
    layout.isPlanCard &&
    (layout.headerTopCramped || layout.toggleFlushToHeader || layout.billingOrderWrong);

  return {
    slideScrubGimmick: signals.slideScrubGimmick && taskPageType,
    editorialStepTemplate: signals.editorialStepTemplate,
    taskPageType,
    liftHover: micro.liftHover,
    rowSlideHover: micro.rowSlideHover,
    numberFlowMissing: micro.numberFlowMissing,
    planCardLayoutIssues,
    headerTopCramped: layout.headerTopCramped,
    toggleFlushToHeader: layout.toggleFlushToHeader,
    billingOrderWrong: layout.billingOrderWrong,
    notes,
  };
}

export function buildJuryReport(
  url: string,
  verify: Awaited<ReturnType<typeof import("./verify").verifyUrl>>,
  solid: JurySolidInteraction,
  taste?: CreativeTaste,
  senior?: SeniorAudit,
): JuryReport {
  const tasteProfile = taste ?? resolveTaste(verify.taste);
  const weights = juryWeightsForTaste(tasteProfile);
  const isEditorial = tasteProfile.verifyProfile === "editorial";

  const notes: Record<string, string[]> = {
    interaction: [...solid.evidence],
    typography: [],
    colorMaterial: [],
    motion: [],
    layout: [],
    concept: [],
  };

  const iMax = isEditorial ? 6 : 6;

  let iRaw = Math.min(iMax, solid.score);
  if (verify.interaction.pointerAffectsVisual) {
    iRaw = Math.min(iMax, iRaw + 1);
    notes.interaction.push("Pointer/hover affects visuals");
  }
  if (verify.interaction.hoverTargets >= 1) {
    iRaw = Math.min(iMax, iRaw + 1);
    notes.interaction.push("Hover states on links/controls");
  }
  if (!isEditorial && !solid.dragChangesValue && solid.scrubPresent) {
    iRaw = Math.min(iRaw, 2);
  }
  if (isEditorial && !solid.scrubPresent && verify.interaction.pointerAffectsVisual) {
    iRaw = Math.max(iRaw, 4);
  }

  let tRaw = 0;
  if (isEditorial && verify.visual.customTypography) {
    tRaw += 3;
    notes.typography.push("Intentional typography (system UI or accent pairing)");
  } else if (verify.visual.displayTypeScale) {
    tRaw += 2;
    notes.typography.push("Display scale present");
  }
  if (!isEditorial && verify.visual.customTypography) {
    tRaw += 2;
    notes.typography.push("Custom display fonts");
  }
  if (verify.visual.score >= 3) tRaw += 1;
  if (isEditorial && verify.visual.editorialLayout) tRaw += 1;

  let cRaw = 0;
  if (verify.slop.clean) {
    cRaw += 1;
    notes.colorMaterial.push("No slop gate flags");
  } else {
    notes.colorMaterial.push(...verify.slop.evidence.filter((e) => !e.startsWith("No common")));
  }
  if (verify.color.semanticTokens) {
    cRaw += 1;
    notes.colorMaterial.push("Semantic color tokens (--surface, --ink, --muted)");
  }
  if (verify.color.mutedHierarchy) {
    cRaw += 1;
    notes.colorMaterial.push("Secondary copy uses muted step — hierarchy by value");
  }
  if (verify.color.contrastOk) {
    cRaw += 1;
    notes.colorMaterial.push("Text contrast meets body copy bar");
  }
  if (verify.color.containedMaterial) {
    cRaw += 1;
    notes.colorMaterial.push("Gradient/material contained — not full-page wallpaper");
  }
  if (verify.color.score >= 4) {
    notes.colorMaterial.push(`Color craft verify ${verify.color.score}/${verify.color.maxScore}`);
  } else if (verify.color.score < 3) {
    notes.colorMaterial.push(...verify.color.evidence.filter((e) => e.startsWith("Define") || e.startsWith("Add") || e.startsWith("Low") || e.startsWith("Full-bleed")));
  }
  cRaw = Math.min(5, cRaw);

  let mRaw = 0;
  if (isEditorial) {
    if (verify.motion.prefersReducedMotionHandled) {
      mRaw += 2;
      notes.motion.push("Reduced motion considered");
    }
    if (!tasteProfile.motionRequired) {
      mRaw += 2;
      notes.motion.push("Light motion appropriate for editorial taste");
    }
    if (verify.motion.animatedElements >= 1) mRaw += 1;
  } else {
    if (verify.motion.gsapPresent) mRaw += 1;
    if (verify.motion.animatedElements >= 1) mRaw += 1;
    if (verify.motion.reducedMotionSimulated) {
      mRaw += 2;
      notes.motion.push("Reduced motion respected");
    } else {
      notes.motion.push("Reduced motion fallback weak");
    }
    if (verify.motion.animatedElements >= 2) mRaw += 1;
  }

  let lRaw = 0;
  if (verify.visual.editorialLayout) {
    lRaw += 2;
    notes.layout.push("Editorial / intentional layout");
  }
  if (verify.visual.score >= 3) lRaw += 2;
  if (isEditorial && verify.visual.score >= 4) lRaw += 1;

  let cptRaw = 0;
  if (verify.slop.clean) {
    cptRaw += 1;
    notes.concept.push("No slop flags — surface not generic template");
  }
  if (isEditorial) {
    cptRaw += 1;
    notes.concept.push("Task-focused layout detected");
  }

  if (senior?.slideScrubGimmick) {
    iRaw = Math.min(iRaw, 1);
    cptRaw = Math.max(0, cptRaw - 2);
    lRaw = Math.max(0, lRaw - 1);
    notes.interaction.push(...senior.notes.filter((n) => n.includes("slide")));
    notes.concept.push("Senior penalty: gimmick interaction on single-task screen");
  }

  if (senior?.editorialStepTemplate) {
    lRaw = Math.max(0, lRaw - 2);
    cptRaw = Math.max(0, cptRaw - 1);
    notes.layout.push(...senior.notes.filter((n) => n.includes("3-step")));
    notes.concept.push("Senior penalty: portfolio/editorial template on task UI");
  }

  if (senior?.liftHover) {
    iRaw = Math.max(0, iRaw - 2);
    cptRaw = Math.max(0, cptRaw - 1);
    notes.interaction.push(...senior.notes.filter((n) => n.includes("translateY lift")));
    notes.concept.push("Senior penalty: layout-shift hover lift");
  }

  if (senior?.rowSlideHover) {
    iRaw = Math.max(0, iRaw - 1);
    notes.interaction.push(...senior.notes.filter((n) => n.includes("translateX slide")));
  }

  if (senior?.numberFlowMissing) {
    iRaw = Math.max(0, iRaw - 2);
    notes.interaction.push(...senior.notes.filter((n) => n.includes("NumberFlow")));
    notes.concept.push("Senior penalty: pricing toggle without digit morph");
  }

  if (senior?.numberFlowMissing === false && senior?.notes.some((n) => n.includes("NumberFlow present"))) {
    iRaw = Math.min(iMax, iRaw + 1);
    notes.interaction.push("NumberFlow on billing price — senior micro craft");
  }

  if (senior?.headerTopCramped || senior?.toggleFlushToHeader) {
    lRaw = Math.max(0, lRaw - 2);
    cptRaw = Math.max(0, cptRaw - 1);
    notes.layout.push(...senior.notes.filter((n) => n.includes("cramped") || n.includes("flush") || n.includes("vertical rhythm")));
    notes.concept.push("Senior penalty: plan card spacing — title/toggle need breathing room");
  }

  if (senior?.billingOrderWrong) {
    lRaw = Math.max(0, lRaw - 1);
    notes.layout.push(...senior.notes.filter((n) => n.includes("billing order")));
  }

  if (senior?.taskPageType && !senior.slideScrubGimmick && !senior.editorialStepTemplate) {
    cptRaw = Math.min(5, cptRaw + 1);
    notes.concept.push("Senior: task UI without checklist template or slide gimmick");
  }

  notes.concept.push("Agent: confirm product-fit concept + originality test in .premium-taste/jury.md");

  const dimensions = [
    scoreDimension("interaction", iRaw, iMax, notes.interaction, weights),
    scoreDimension("typography", tRaw, 5, notes.typography, weights),
    scoreDimension("colorMaterial", cRaw, isEditorial ? 5 : 5, notes.colorMaterial, weights),
    scoreDimension("motion", mRaw, 5, notes.motion, weights),
    scoreDimension("layout", lRaw, 5, notes.layout, weights),
    scoreDimension("concept", cptRaw, 5, notes.concept, weights),
  ];

  const total = Math.round(dimensions.reduce((s, d) => s + d.weighted, 0));
  const verdict =
    total >= JURY_THRESHOLDS.exceptional
      ? "exceptional"
      : total >= JURY_THRESHOLDS.ship
        ? "ship"
        : total >= 60
          ? "iterate"
          : "reject";

  const agentNextSteps: string[] = [];
  if (!isEditorial && !solid.dragChangesValue && solid.scrubPresent) {
    agentNextSteps.push("If scrub is not your declared primary mechanic, remove it — jury rewards product-fit interaction");
  }
  if (isEditorial && !verify.interaction.pointerAffectsVisual) {
    agentNextSteps.push("Editorial taste: add hover preview, expand, or one micro-interaction per section");
  }
  if (total < JURY_THRESHOLDS.ship) {
    agentNextSteps.push(
      `Jury ${total}/100 — need ≥${JURY_THRESHOLDS.ship} to ship, ≥${JURY_THRESHOLDS.exceptional} for portfolio-grade bar`,
    );
  }
  if (!verify.slop.clean) {
    agentNextSteps.push("Remove template premium signals");
  }
  if (senior?.slideScrubGimmick || senior?.editorialStepTemplate) {
    agentNextSteps.unshift("Senior jury: remove gimmick/template patterns — see senior audit");
  }
  if (senior?.liftHover || senior?.rowSlideHover || senior?.numberFlowMissing) {
    agentNextSteps.unshift("Senior micro craft failed — see senior audit (lift hover, row slide, or missing NumberFlow)");
  }
  if (senior?.planCardLayoutIssues) {
    agentNextSteps.unshift("Senior plan-card layout failed — spacing + billing toggle order (see senior audit)");
  }
  agentNextSteps.push("Automated jury ≠ human eye — fill .premium-taste/jury.md with honest self-score");

  return {
    version: "0.4.0",
    url,
    taste: tasteProfile.id,
    total,
    maxTotal: 100,
    verdict,
    thresholds: JURY_THRESHOLDS,
    dimensions,
    solidInteraction: solid,
    verifyPassed: verify.passed,
    agentNextSteps,
    seniorAudit: senior?.notes,
  };
}

export function formatJuryTerminal(report: JuryReport): string {
  const lines = [
    `Premium Taste jury  ${report.url}`,
    "",
    `taste     ${report.taste ?? "spectacle"}`,
  ];

  if (report.briefPath) {
    lines.push(`brief     ${report.briefPath}`);
  }
  if (report.pageType) {
    lines.push(`page type ${report.pageType}`);
  }

  lines.push(
    `score     ${report.total}/${report.maxTotal}  (${report.verdict})`,
    `verify    ${report.verifyPassed ? "pass" : "fail"}`,
    "",
    "dimensions (0–10, weighted):",
  );

  for (const d of report.dimensions) {
    lines.push(`  ${d.title.padEnd(22)} ${d.score.toFixed(1)}/10  → ${d.weighted}/${d.weight} wt`);
    for (const n of d.notes.slice(0, 2)) {
      lines.push(`    · ${n}`);
    }
  }

  if (report.seniorAudit?.length) {
    lines.push("");
    lines.push("senior audit:");
    report.seniorAudit.forEach((n) => lines.push(`  · ${n}`));
  }

  lines.push("");
  lines.push(`ship ≥ ${report.thresholds.ship} · portfolio-grade bar ≥ ${report.thresholds.exceptional}`);
  lines.push("");
  lines.push("note: automated jury checks slop + tokens + micro craft — your eye still wins");
  lines.push("");

  if (report.agentNextSteps.length) {
    lines.push("next steps:");
    report.agentNextSteps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  }

  lines.push("");
  lines.push("agent: fill .premium-taste/jury.md with honest concept + craft self-score");

  return lines.join("\n");
}

export async function runJury(
  url: string,
  opts: {
    verifyProfile?: import("./types").VerifyProfile;
    pageType?: string;
    taste?: string;
    productDescription?: string;
    briefPath?: string | null;
  },
): Promise<JuryReport> {
  const { verifyUrl, closeBrowser } = await import("./verify");
  const { getPageType } = await import("./page-types");
  const { inferDirection } = await import("./direction");
  const pageType = opts.pageType ?? "404";
  const direction = inferDirection({
    pageType,
    productDescription: opts.productDescription,
    tasteOverride: opts.taste,
  });
  const tasteProfile = direction.scoringProfile;

  let verifyProfile = opts.verifyProfile ?? tasteProfile.verifyProfile;
  if (opts.pageType && !opts.verifyProfile) {
    verifyProfile = getPageType(pageType)?.verifyProfile ?? verifyProfile;
  }

  const verify = await verifyUrl({
    url,
    verifyProfile,
    taste: tasteProfile.id,
    pageType,
    productDescription: opts.productDescription,
  });
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const solid = await verifySolidInteraction(page);
    const senior = await auditSeniorCraft(page, pageType);
    return {
      ...buildJuryReport(url, verify, solid, tasteProfile, senior),
      briefPath: opts.briefPath ?? null,
      pageType,
    };
  } finally {
    await page.close();
    await closeBrowser();
  }
}

export function juryMarkdownTemplate(report: JuryReport): string {
  return `# Jury score — ${report.url}

**Automated total:** ${report.total}/${report.maxTotal} (${report.verdict})

## Agent self-score (honest)

| Dimension | Auto | You | Notes |
|---|---|---|---|
${report.dimensions.map((d) => `| ${d.title} | ${d.score}/10 | _/10 | |`).join("\n")}

## Concept (one sentence)


## Would a senior jury honor this?


## What to fix before ship

`;
}
