import type { VerifyReport } from "./types";
import { CREATIVE_RUBRIC } from "./types";
import { CLI_NAME } from "./constants";

export function buildVerifyReport(
  url: string,
  briefPath: string | null,
  result: Awaited<ReturnType<typeof import("./verify").verifyUrl>>,
): VerifyReport {
  const agentChecklist = CREATIVE_RUBRIC.flatMap((d) =>
    d.criteria.map((c) => `[${d.title}] ${c}`),
  );

  return {
    version: "0.4.0",
    url,
    briefPath,
    verifyProfile: result.verifyProfile,
    taste: result.taste,
    motion: result.motion,
    interaction: result.interaction,
    visual: result.visual,
    slop: result.slop,
    color: result.color,
    rubric: {
      dimensions: CREATIVE_RUBRIC,
      agentChecklist,
      minimumCreativeScore: 70,
    },
    passed: result.passed,
    agentNextSteps: result.agentNextSteps,
  };
}

export function formatVerifyTerminal(report: VerifyReport): string {
  const status = report.passed ? "✓ creative verify pass" : "✗ creative verify fail";
  const lines = [
    `Premium Taste verify  ${report.url}`,
    status,
    "",
    `profile: ${report.verifyProfile}`,
    `taste:   ${report.taste}`,
    "",
    "visual:",
    `  type scale       ${report.visual.displayTypeScale}`,
    `  custom fonts     ${report.visual.customTypography}`,
    `  custom assets    ${report.visual.customAssets}`,
    `  editorial layout ${report.visual.editorialLayout}`,
    `  score            ${report.visual.score}/${report.visual.maxScore}`,
    "",
    "slop gate:",
    `  clean            ${report.slop.clean}`,
    `  flags            ${report.slop.flags}`,
    "",
    "color:",
    `  semantic tokens  ${report.color.semanticTokens}`,
    `  muted hierarchy  ${report.color.mutedHierarchy}`,
    `  contrast ok      ${report.color.contrastOk}`,
    `  contained material ${report.color.containedMaterial}`,
    `  score            ${report.color.score}/${report.color.maxScore}`,
    "",
    "motion:",
    `  gsap present     ${report.motion.gsapPresent}`,
    `  animated els     ${report.motion.animatedElements}`,
    `  reduced motion   ${report.motion.reducedMotionSimulated}`,
    "",
    "interaction:",
    `  controls         ${report.interaction.interactiveControls}`,
    `  hover states     ${report.interaction.hoverTargets}`,
    `  pointer affects  ${report.interaction.pointerAffectsVisual}`,
    "",
  ];

  if (report.agentNextSteps.length) {
    lines.push("next steps for agent:");
    report.agentNextSteps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  }

  lines.push("");
  lines.push(`rubric: self-score ≥ ${report.rubric.minimumCreativeScore}/100 — compare to reference screenshots`);
  lines.push(`run: ${CLI_NAME} design -p "your prompt"`);

  return lines.join("\n");
}

export function toJson(report: VerifyReport): string {
  return JSON.stringify(report, null, 2);
}
