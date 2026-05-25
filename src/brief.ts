import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BriefMode, CreativeBrief, CreativeReference, CreativeTechnique, GsapSpec } from "./types";
import { getPageType, techniquesForPageType } from "./page-types";
import { inferDirection } from "./direction";
import { CREATIVE_RUBRIC, DEFAULT_PHASES } from "./types";
import {
  copyVoiceRules,
  formatAssetPlanMarkdown,
  materializeAssets,
  resolveAssetPlan,
} from "./assets";
import { enrichProductRequest, resolveColorGuidance } from "./color-craft";
import { resolveMicroInteractions, formatMicroCliBlock, microFitConstraints } from "./micro-interactions";
import { applyRedesignEnrichment, redesignFitConstraints, resolveRedesignWorkflow } from "./redesign";
import {
  formatTypographyMarkdown,
  resolveTypographyDirection,
  typographyAntiPatterns,
} from "./typography";

const GSAP_SPEC: GsapSpec = {
  required: true,
  plugins: ["ScrollTrigger (if scroll-driven)", "CustomEase (optional)"],
  timelineNotes: [
    "Motion must serve concept — not default entrance on everything",
    "Use gsap.context() — revert on SPA unmount",
    "prefers-reduced-motion: static or opacity only",
  ],
  reducedMotionFallback: "matchMedia('(prefers-reduced-motion: reduce)') → skip motion, keep opacity fade or static",
  performanceRules: ["Only transform + opacity", "No layout thrashing"],
};

const LIGHT_MOTION_SPEC: GsapSpec = {
  required: false,
  plugins: ["Optional — only if scroll choreography needed"],
  timelineNotes: [
    "CSS transitions preferred for state and hover",
    "Motion must respond to user action or page state",
    "prefers-reduced-motion: instant state change",
  ],
  reducedMotionFallback: "matchMedia('(prefers-reduced-motion: reduce)') → disable ambient loops",
  performanceRules: ["No decorative ambient loops on task-focused screens"],
};

function readDesignMd(designMdPath?: string): string | undefined {
  if (!designMdPath) return undefined;
  try {
    return readFileSync(resolve(designMdPath), "utf-8");
  } catch {
    return undefined;
  }
}

function conceptPlaceholder(profileLabel: string): string {
  return `[AGENT: Write one sentence after discovery — ${profileLabel}. Must fit product job. Cannot name a reference or template.]`;
}

function mergeInteractionRequirements(
  refs: CreativeReference[],
  pageType: string,
  directionInteraction: string[],
): string[] {
  const set = new Set<string>(directionInteraction);
  const profile = getPageType(pageType);

  for (const d of profile?.interactionDefaults ?? []) set.add(d);

  for (const r of refs) {
    set.add(`Study ${r.name} for courage level — not surface clone`);
    if (r.tags.interaction.includes("Game")) set.add("Playable mechanic with state — only if concept requires it");
    if (r.tags.interaction.includes("Interactive")) set.add("Pointer/touch affects visuals when product-appropriate");
  }
  return [...set];
}

function buildReferenceStudy(refs: CreativeReference[]): string[] {
  return refs.flatMap((r) => {
    const lines = [`**${r.name}** — study screenshot: ${r.screenshot ?? "(none)"}`];
    lines.push(`Extract courage: ${r.premiumBecause?.slice(0, 2).join("; ") ?? r.concept}`);
    if (r.avoidList?.length) lines.push(`Similarity trap: ${r.avoidList.join("; ")}`);
    lines.push("Do NOT copy layout, color field, or marks from screenshot");
    return lines;
  });
}

function buildPrincipleStudy(
  principles: { id: string; name: string; question: string }[],
): string[] {
  return principles.map((p) => `**${p.name}** — ${p.question}`);
}

export function buildBrief(opts: {
  pageType: string;
  references: CreativeReference[];
  techniques?: CreativeTechnique[];
  mode?: BriefMode;
  taste?: string;
  designMdPath?: string;
  productDescription?: string;
}): CreativeBrief {
  const mode: BriefMode = opts.mode ?? (opts.references.length > 0 ? "reference" : "creative");
  const enrichment = enrichProductRequest({
    pageType: opts.pageType,
    productDescription: opts.productDescription,
  });
  const redesign = resolveRedesignWorkflow(opts.productDescription);
  const pageType = enrichment.inferredPageType ?? opts.pageType;
  const profile = getPageType(pageType);
  const designMd = readDesignMd(opts.designMdPath);
  const refs = opts.references;
  let productDescription = redesign.detected
    ? applyRedesignEnrichment(enrichment.productDescription)
    : enrichment.productDescription;
  const wasEnriched = enrichment.wasVague || redesign.detected;

  const direction = inferDirection({
    pageType,
    goal: profile?.goal,
    designMd,
    productDescription,
    tasteOverride: opts.taste,
    referenceNames: refs.map((r) => r.name),
  });

  const taste = direction.scoringProfile;
  const techniques =
    opts.techniques ?? (mode === "reference" ? techniquesForPageType(pageType, refs) : []);

  const colorResolved = resolveColorGuidance(pageType, productDescription);
  const colorGuidance = {
    label: colorResolved.pattern.label,
    palette: colorResolved.pattern.palette,
    principles: colorResolved.principles.map((p) => p.rule),
    do: colorResolved.pattern.do,
    avoid: colorResolved.pattern.avoid,
    semanticTokenCss: colorResolved.semanticTokens.cssTemplate,
    agentInstructions: colorResolved.agentInstructions,
  };

  const typography = resolveTypographyDirection({
    pageType,
    productDescription,
    tasteTypography: taste.typographyDirection,
    references: refs,
  });

  const typographyDirection = typography.direction;

  const antiPatterns = [
    ...direction.avoidSimilarTo,
    ...typographyAntiPatterns(typography),
    "One-shot HTML without discovery + polish passes",
  ];

  const fitConstraints = [
    ...direction.fitConstraints,
    ...microFitConstraints(pageType, productDescription),
    ...(redesign.detected ? redesignFitConstraints() : []),
  ];

  if (mode === "reference") {
    antiPatterns.push("Cloning reference layout, color field, or marks");
  }

  const motionSpec = taste.gsapRequired ? GSAP_SPEC : LIGHT_MOTION_SPEC;
  const assetPlan = resolveAssetPlan({
    pageType,
    productDescription,
  });
  void materializeAssets(assetPlan);
  const voiceRules = copyVoiceRules();
  const microInteractions = resolveMicroInteractions(pageType, productDescription);

  return {
    version: "0.6.1",
    generatedAt: new Date().toISOString(),
    mode,
    taste: taste.id,
    tasteProfile: taste,
    directionReason: direction.reason,
    pageType,
    pageTypeProfile: profile,
    goal: `${profile?.goal ?? "Premium creative UI"} — ${direction.reason}`,
    references: refs,
    techniques,
    craftPrinciples: direction.craftPrinciples.map((p) => ({
      id: p.id,
      name: p.name,
      question: p.question,
    })),
    discoveryQuestions: direction.discoveryQuestions,
    fitConstraints,
    originalityTest: direction.originalityTest,
    avoidSimilarTo: direction.avoidSimilarTo,
    concept: conceptPlaceholder(profile?.label ?? pageType),
    typographyDirection,
    typographyGuidance: typography,
    designMd,
    motionSpec,
    interactionRequirements: mergeInteractionRequirements(refs, pageType, direction.interactionIntent),
    phases: DEFAULT_PHASES,
    rubricDimensions: CREATIVE_RUBRIC,
    referenceStudy:
      mode === "reference" ? buildReferenceStudy(refs) : buildPrincipleStudy(direction.craftPrinciples),
    antiPatterns: [...new Set(antiPatterns)],
    qualityGate: `Answer discovery → list micro-interactions in discovery.md → write concept → build → premium-taste verify <url> → premium-taste jury <url>. Verify/jury read .premium-taste/brief.json automatically — same context as brief. Layout without micro = incomplete.`,
    assetPlan,
    copyVoiceRules: voiceRules,
    colorGuidance,
    productEnriched: wasEnriched,
    enrichedProductDescription: wasEnriched ? productDescription : undefined,
    productDescription: productDescription || undefined,
    redesign: redesign.detected ? redesign : undefined,
    microInteractions,
  };
}

function formatReferenceBlock(r: CreativeReference): string {
  const lines = [
    `- **${r.name}**`,
    r.screenshot ? `  - Screenshot: \`${r.screenshot}\` — study courage, not surface` : `  - Study courage, not surface`,
    `  - Why premium: ${r.premiumBecause?.join("; ") ?? r.concept}`,
  ];
  if (r.avoidList?.length) lines.push(`  - **Similarity trap:** ${r.avoidList.join("; ")}`);
  return lines.join("\n");
}

export function briefToMarkdown(brief: CreativeBrief): string {
  const profile = brief.pageTypeProfile;

  const lines = [
    `# Creative brief — ${brief.pageType}`,
    "",
    `**Mode:** ${brief.mode === "creative" ? "Designer-first (invent for product)" : "Reference study (courage only — no clone)"}`,
    `**Direction:** ${brief.directionReason ?? ""}`,
    `**Goal:** ${brief.goal}`,
    "",
    `## Senior micro — Premium Taste suggests this (required, not optional)`,
    "",
    `You do not need to be a senior designer — **Premium Taste tells you what to ship.** Implement every item below before calling the page done.`,
    "",
    ...brief.microInteractions!.proactiveSuggestions.map((s) => `- ${s}`),
    "",
    `## Product discovery (answer before concept)`,
    "",
    ...brief.discoveryQuestions.map((q) => `- **${q.id}:** ${q.prompt}`),
    "",
    `## Originality test`,
    brief.originalityTest,
    "",
    `## Concept (one sentence — agent writes)`,
    brief.concept,
    "",
    `## Fit constraints (functional — not aesthetic presets)`,
    ...brief.fitConstraints.map((c) => `- ${c}`),
    "",
    `## Craft principles (questions — not steal lists)`,
    ...brief.craftPrinciples.map((p) => `- **${p.name}:** ${p.question}`),
    "",
  ];

  if (brief.redesign?.detected) {
    lines.push(
      `## Redesign workflow (find it in the project — then upgrade craft)`,
      "",
      `User wants a **high-quality redesign**, not a new page from scratch. Locate the existing UI in this repo, then edit those files.`,
      "",
      `### 1. Locate target`,
      ...brief.redesign.locateTarget.map((s) => `- ${s}`),
      "",
      `### 2. Photo / image`,
      ...brief.redesign.photoHandling.map((s) => `- ${s}`),
      "",
      `### 3. Preserve`,
      ...brief.redesign.preserve.map((s) => `- ${s}`),
      "",
      `### 4. Upgrade`,
      ...brief.redesign.upgrade.map((s) => `- ${s}`),
      "",
      `Document in \`${brief.redesign.documentPath}\`:`,
      ...brief.redesign.documentSections.map((s) => `- ${s}`),
      "",
    );
  }

  if (brief.productEnriched && brief.enrichedProductDescription) {
    lines.push(
      `## Premium prompt (auto-expanded from your request)`,
      "",
      `You asked briefly — Premium Taste expanded this into senior craft direction:`,
      "",
      `> ${brief.enrichedProductDescription}`,
      "",
    );
  }

  if (brief.colorGuidance) {
    lines.push(
      `## Color & material (premium craft)`,
      "",
      `**${brief.colorGuidance.label}** — ${brief.colorGuidance.palette}`,
      "",
      `### Principles`,
      ...brief.colorGuidance.principles.map((p) => `- ${p}`),
      "",
      `### Do`,
      ...brief.colorGuidance.do.map((d) => `- ${d}`),
      "",
      `### Avoid`,
      ...brief.colorGuidance.avoid.map((a) => `- ${a}`),
      "",
      `### Semantic tokens (paste into CSS first)`,
      "```css",
      brief.colorGuidance.semanticTokenCss.trim(),
      "```",
      "",
    );
  }

  if (brief.microInteractions) {
    lines.push(
      `## Micro-interactions reference`,
      "",
      ...brief.microInteractions.principles.map((p) => `- ${p}`),
      "",
      `**Checklist**`,
      ...brief.microInteractions.mustHave.map((h) => `- ${h}`),
      "",
      `**Avoid (kills premium feel)**`,
      ...brief.microInteractions.antiPatterns.map((a) => `- ${a}`),
      "",
    );
    if (brief.microInteractions.libraries) {
      lines.push(`**Libraries**`);
      for (const [k, v] of Object.entries(brief.microInteractions.libraries)) {
        lines.push(`- ${k}: ${v}`);
      }
      lines.push("");
    }
  }

  if (profile?.conceptQuestions.length) {
    lines.push(`## Page-specific questions`, "", ...profile.conceptQuestions.map((q) => `- ${q}`), "");
  }

  if (brief.mode === "reference" && brief.references.length) {
    lines.push(`## Calibration references (courage — don't clone)`, "", ...brief.references.map(formatReferenceBlock), "");
  }

  lines.push(`## Study checklist`, ...brief.referenceStudy.map((s) => `- ${s}`), "");

  if (brief.copyVoiceRules?.length) {
    lines.push(
      `## Copy voice (no AI brochure rhythm)`,
      "",
      ...brief.copyVoiceRules.map((r) => `- ${r}`),
      "",
    );
  }

  if (brief.assetPlan) {
    lines.push(`## Asset plan (auto-resolved)`, "", ...formatAssetPlanMarkdown(brief.assetPlan));
  }

  if (brief.designMd) {
    lines.push(`## Project DESIGN.md`, "", "```markdown", brief.designMd.trim(), "```", "");
  }

  lines.push(
    `## Typography`,
    ...formatTypographyMarkdown(brief.typographyGuidance ?? { direction: brief.typographyDirection, fontPolicy: "mixed", pairings: [], avoid: [], isSansFirst: false, principles: [] }),
    "",
    `## Motion (${brief.motionSpec.required ? "GSAP allowed if concept needs it" : "light — prefer CSS/state"})`,
    ...brief.motionSpec.timelineNotes.map((n) => `- ${n}`),
    `- Reduced motion: ${brief.motionSpec.reducedMotionFallback}`,
    "",
    `## Interaction intent`,
    ...brief.interactionRequirements.map((r) => `- ${r}`),
    "",
    `## Phases (mandatory)`,
    ...brief.phases.flatMap((p) => [
      `### ${p.title}`,
      ...p.agentInstructions.map((i) => `- ${i}`),
      `**Done when:** ${p.doneWhen.join("; ")}`,
      `**Do not:** ${p.doNot.join("; ")}`,
      "",
    ]),
    `## Rubric (/100)`,
    ...brief.rubricDimensions.map((d) => `- **${d.title}** (${d.weight}pts): ${d.criteria.join("; ")}`),
    "",
    `## Avoid`,
    ...brief.avoidSimilarTo.map((a) => `- ${a}`),
    "",
    `## Quality gate`,
    brief.qualityGate,
  );

  return lines.join("\n");
}
