import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_BRIEF_PATH, resolveDefaultBriefPath } from "./constants";
import { inferDirection } from "./direction";
import { getPageType } from "./page-types";
import type { CreativeBrief, CreativeTaste, VerifyProfile } from "./types";

export { DEFAULT_BRIEF_PATH, LEGACY_BRIEF_PATH } from "./constants";

export type BriefContextInput = {
  briefPath?: string;
  noBrief?: boolean;
  pageType?: string;
  taste?: string;
  productDescription?: string;
  verifyProfile?: VerifyProfile;
};

export type ResolvedRunContext = {
  briefPath: string | null;
  briefLoaded: boolean;
  pageType: string;
  tasteId: string;
  productDescription?: string;
  verifyProfile: VerifyProfile;
  tasteProfile: CreativeTaste;
  /** CLI flags that overrode brief.json */
  cliOverrides: string[];
};

function loadBriefFile(path: string): CreativeBrief | null {
  try {
    const raw = readFileSync(resolve(path), "utf-8");
    return JSON.parse(raw) as CreativeBrief;
  } catch {
    return null;
  }
}

export function productDescriptionFromBrief(brief: CreativeBrief): string | undefined {
  return brief.productDescription ?? brief.enrichedProductDescription;
}

/** Merge CLI flags with brief.json — explicit CLI wins over brief. */
export function resolveRunContext(input: BriefContextInput = {}): ResolvedRunContext {
  const briefPath = input.briefPath
    ? resolve(input.briefPath)
    : resolveDefaultBriefPath();
  const brief = input.noBrief ? null : loadBriefFile(briefPath);
  const briefLoaded = brief !== null;
  const cliOverrides: string[] = [];

  let pageType: string;
  if (input.pageType?.trim()) {
    pageType = input.pageType.trim();
    if (briefLoaded && brief!.pageType !== pageType) cliOverrides.push("pageType");
  } else {
    pageType = brief?.pageType ?? "404";
  }

  let tasteOverride: string | undefined;
  if (input.taste && input.taste !== "auto") {
    tasteOverride = input.taste;
    if (briefLoaded && brief!.taste !== tasteOverride) cliOverrides.push("taste");
  } else if (briefLoaded) {
    tasteOverride = brief!.taste;
  }

  let productDescription: string | undefined;
  if (input.productDescription?.trim()) {
    productDescription = input.productDescription.trim();
    const fromBrief = brief ? productDescriptionFromBrief(brief) : undefined;
    if (briefLoaded && fromBrief && fromBrief !== productDescription) {
      cliOverrides.push("productDescription");
    }
  } else if (brief) {
    productDescription = productDescriptionFromBrief(brief);
  }

  const direction = inferDirection({
    pageType,
    productDescription,
    tasteOverride,
  });
  const tasteProfile = direction.scoringProfile;

  let verifyProfile: VerifyProfile;
  if (input.verifyProfile) {
    verifyProfile = input.verifyProfile;
    if (briefLoaded) {
      const fromBrief =
        brief!.pageTypeProfile?.verifyProfile ?? getPageType(pageType)?.verifyProfile;
      if (fromBrief && fromBrief !== verifyProfile) cliOverrides.push("verifyProfile");
    }
  } else {
    verifyProfile =
      brief?.pageTypeProfile?.verifyProfile ??
      getPageType(pageType)?.verifyProfile ??
      tasteProfile.verifyProfile;
  }

  return {
    briefPath: briefLoaded ? briefPath : null,
    briefLoaded,
    pageType,
    tasteId: tasteProfile.id,
    productDescription,
    verifyProfile,
    tasteProfile,
    cliOverrides,
  };
}

export function formatContextLine(ctx: ResolvedRunContext): string {
  if (!ctx.briefLoaded) {
    return `context:   cli only (${ctx.pageType} · ${ctx.tasteId})`;
  }
  const overrideNote =
    ctx.cliOverrides.length > 0 ? ` · cli override: ${ctx.cliOverrides.join(", ")}` : "";
  return `context:   ${ctx.briefPath} (${ctx.pageType} · ${ctx.tasteId})${overrideNote}`;
}
