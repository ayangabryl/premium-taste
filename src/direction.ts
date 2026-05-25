import type { CreativeTaste } from "./types";
import { getPageType } from "./page-types";
import {
  fitConstraintsFor,
  loadDiscoveryQuestions,
  originalityTestPrompt,
  pickCraftPrinciples,
  similarityTrapsForReferences,
  type CraftPrinciple,
  type DiscoveryQuestion,
} from "./discovery";
import { resolveTaste } from "./tastes";

/** Designer-first direction — product fit + originality, not aesthetic presets. */
export type ProductDirection = {
  /** Internal scoring weights only — not shown as "pick this look" */
  scoringProfile: CreativeTaste;
  reason: string;
  discoveryQuestions: DiscoveryQuestion[];
  fitConstraints: string[];
  craftPrinciples: CraftPrinciple[];
  originalityTest: string;
  avoidSimilarTo: string[];
  interactionIntent: string[];
};

export function inferDirection(opts: {
  pageType: string;
  goal?: string;
  designMd?: string;
  productDescription?: string;
  tasteOverride?: string;
  referenceNames?: string[];
}): ProductDirection {
  const profile = getPageType(opts.pageType);
  const scoringProfile = resolveTaste(opts.tasteOverride, opts.pageType);

  const discoveryQuestions = loadDiscoveryQuestions(opts.pageType);
  const fitConstraints = fitConstraintsFor(opts.pageType, opts.productDescription);
  const craftPrinciples = pickCraftPrinciples(opts.pageType, 3);
  const originalityTest = originalityTestPrompt(profile);

  const avoidSimilarTo = [
    ...(profile?.antiPatterns ?? []),
    ...scoringProfile.antiPatterns.filter((a) => !a.toLowerCase().includes("gsap")),
    ...(opts.referenceNames?.length ? similarityTrapsForReferences(opts.referenceNames) : []),
    "Copying a reference color field + layout recipe",
    "Cool demo aesthetic that does not match the product job",
  ];

  const interactionIntent = [...(profile?.interactionDefaults ?? [])];
  if (opts.pageType === "auth") {
    interactionIntent.push("Atmosphere responds to digit focus and fill — not decorative motion");
  }

  const productLine = opts.productDescription?.trim();
  const reason = productLine
    ? `Designer-first: ${profile?.label ?? opts.pageType} for "${productLine.slice(0, 80)}${productLine.length > 80 ? "…" : ""}"`
    : `Designer-first: ${profile?.label ?? opts.pageType} — answer discovery questions before choosing visuals`;

  return {
    scoringProfile,
    reason,
    discoveryQuestions,
    fitConstraints,
    craftPrinciples,
    originalityTest,
    avoidSimilarTo: [...new Set(avoidSimilarTo)],
    interactionIntent: [...new Set(interactionIntent)],
  };
}

/** @deprecated Use craft principles — kept for verify/jury weight routing */
export function pickTechniquesForDirection(_pageTypeId: string, direction: ProductDirection, _count = 3) {
  return direction.craftPrinciples;
}

export { juryWeightsForTaste, resolveTaste, getTaste, loadTastes, pickTechniquesForTaste } from "./tastes";
