import typographyData from "../corpus/typography.json";
import { matchVagueRule } from "./color-craft";
import type { CreativeReference } from "./types";

export type TypographyGuidance = {
  direction: string;
  fontPolicy: "sans-product" | "custom-display" | "system-ok" | "mixed";
  pairings: string[];
  avoid: string[];
  isSansFirst: boolean;
  principles: string[];
};

type PageTypography = {
  direction: string;
  pairings?: string[];
  avoid?: string[];
};

type ProductTypographyRule = {
  id: string;
  match: string;
  direction: string;
  avoid?: string[];
};

const SANS_FIRST_PAGE_TYPES = new Set(typographyData.sansFirstPageTypes as string[]);
const SANS_FIRST_KEYWORDS = new RegExp(typographyData.sansFirstKeywords as string, "i");
const SERIF_SIGNAL =
  /\b(fraunces|instrument serif|libre caslon|newsreader|playfair|lora|merriweather|crimson|baskerville|garamond|georgia|times new roman)\b/i;

function loadPageTypeRules(): Record<string, PageTypography> {
  return typographyData.pageTypes as Record<string, PageTypography>;
}

function loadProductRules(): ProductTypographyRule[] {
  return typographyData.productRules as ProductTypographyRule[];
}

function matchProductRule(text: string): ProductTypographyRule | undefined {
  const hay = text.toLowerCase();
  return loadProductRules().find((rule) => {
    const parts = rule.match.split("|");
    return parts.some((p) => hay.includes(p.trim()));
  });
}

export function isSansFirstContext(pageType: string, productDescription?: string): boolean {
  const text = productDescription?.trim() ?? "";
  if (matchVagueRule(text)?.id === "payment-vague") return true;
  if (text && SANS_FIRST_KEYWORDS.test(text)) return true;
  return SANS_FIRST_PAGE_TYPES.has(pageType);
}

export function resolveTypographyDirection(opts: {
  pageType: string;
  productDescription?: string;
  tasteTypography?: string;
  references?: CreativeReference[];
}): TypographyGuidance {
  const refs = opts.references ?? [];
  if (refs.length > 0) {
    return {
      direction: `Invent for product — study references for courage only. Reference type notes: ${refs.map((r) => `${r.name}: ${r.typography}`).join(" | ")}`,
      fontPolicy: "mixed",
      pairings: [],
      avoid: [],
      isSansFirst: isSansFirstContext(opts.pageType, opts.productDescription),
      principles: typographyData.principles as string[],
    };
  }

  const productRule = matchProductRule(opts.productDescription ?? "");
  const pageRule = loadPageTypeRules()[opts.pageType];
  const sansFirst = isSansFirstContext(opts.pageType, opts.productDescription);

  if (productRule || sansFirst) {
    const direction = productRule?.direction ?? pageRule?.direction ?? (typographyData.defaultCreative as string);
    const avoid = [
      ...(productRule?.avoid ?? []),
      ...(pageRule?.avoid ?? []),
      ...(sansFirst ? ["Defaulting to Fraunces/editorial serif on task UI"] : []),
    ];
    return {
      direction,
      fontPolicy: "sans-product",
      pairings: pageRule?.pairings ?? ["Source Sans 3", "IBM Plex Sans"],
      avoid: [...new Set(avoid)],
      isSansFirst: true,
      principles: typographyData.principles as string[],
    };
  }

  if (pageRule) {
    return {
      direction: pageRule.direction,
      fontPolicy: opts.pageType === "hero" || opts.pageType === "404" ? "custom-display" : "mixed",
      pairings: pageRule.pairings ?? [],
      avoid: pageRule.avoid ?? [],
      isSansFirst: false,
      principles: typographyData.principles as string[],
    };
  }

  const fallback = opts.tasteTypography ?? (typographyData.defaultCreative as string);
  return {
    direction: fallback,
    fontPolicy: "mixed",
    pairings: [],
    avoid: [],
    isSansFirst: false,
    principles: typographyData.principles as string[],
  };
}

export function typographyAntiPatterns(guidance: TypographyGuidance): string[] {
  return guidance.avoid.map((a) => `Typography: ${a}`);
}

export function formatTypographyMarkdown(guidance: TypographyGuidance): string[] {
  const lines = [guidance.direction, ""];
  if (guidance.isSansFirst) {
    lines.push("**Sans-first task UI** — form, labels, headline, and preview stay sans unless user explicitly asks for editorial type.");
    lines.push("");
  }
  if (guidance.pairings.length) {
    lines.push("**Suggested pairings**", ...guidance.pairings.map((p) => `- ${p}`), "");
  }
  if (guidance.avoid.length) {
    lines.push("**Avoid**", ...guidance.avoid.map((a) => `- ${a}`), "");
  }
  return lines;
}

/** Fail slop/verify when task UI uses editorial serif on primary headline. */
export async function auditTaskUiTypography(
  page: import("playwright").Page,
  pageType?: string,
  productDescription?: string,
): Promise<{ serifOnTaskUi: boolean; evidence: string[] }> {
  if (!isSansFirstContext(pageType ?? "", productDescription)) {
    return { serifOnTaskUi: false, evidence: [] };
  }

  const signals = await page.evaluate(() => {
    const headline = document.querySelector("h1, .checkout h1, header h1");
    const form = document.querySelector("form, [role='form'], input[type='text'], input[inputmode='numeric']");
    if (!headline || !form) return { fontFamily: "", hasForm: false };
    return { fontFamily: getComputedStyle(headline).fontFamily, hasForm: true };
  });

  if (!signals.hasForm) return { serifOnTaskUi: false, evidence: [] };

  const serifOnTaskUi = SERIF_SIGNAL.test(signals.fontFamily);
  const evidence: string[] = [];
  if (serifOnTaskUi) {
    evidence.push(
      `Task UI serif headline (${signals.fontFamily.split(",")[0]?.trim()}) — Premium Taste is sans-first for checkout/auth/pricing; use product-scale sans`,
    );
  }
  return { serifOnTaskUi, evidence };
}
