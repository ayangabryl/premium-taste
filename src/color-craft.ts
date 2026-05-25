import colorCraftData from "../corpus/color-craft.json";
import type { PageTypeProfile } from "./types";
import { getPageType } from "./page-types";

export type ColorPrinciple = { id: string; rule: string };

export type ColorPattern = {
  label: string;
  palette: string;
  do: string[];
  avoid: string[];
};

export type ColorGuidance = {
  principles: ColorPrinciple[];
  pattern: ColorPattern;
  semanticTokens: { cssTemplate: string; notes: string[] };
  agentInstructions: string[];
};

export type ProductEnrichment = {
  productDescription: string;
  wasVague: boolean;
  inferredPageType?: string;
  colorGuidance: ColorGuidance;
};

type VaguePromptRule = {
  id: string;
  match: string;
  pageType: string;
  expansion: string;
};

const VAGUE_MAX_CHARS = 120;

function loadVagueRules(): VaguePromptRule[] {
  return colorCraftData.vaguePrompts as VaguePromptRule[];
}

function loadPrinciples(): ColorPrinciple[] {
  return colorCraftData.principles as ColorPrinciple[];
}

function loadPattern(pageType: string): ColorPattern {
  const patterns = colorCraftData.patternsByPageType as Record<string, ColorPattern>;
  return patterns[pageType] ?? patterns.default!;
}

function hasDetailSignals(text: string): boolean {
  const detail =
    /\b(editorial|mesh|gradient|warm|cool|minimal|playful|framer|linear|annual|monthly|toggle|icon|shadow|typography|accent|neutral|brand|audience|saas|b2b|consumer)\b/i;
  return detail.test(text) || text.length > VAGUE_MAX_CHARS;
}

export function isVagueProductRequest(productDescription?: string): boolean {
  const raw = productDescription?.trim() ?? "";
  if (!raw) return true;
  if (hasDetailSignals(raw)) return false;
  return raw.length <= VAGUE_MAX_CHARS;
}

export function matchVagueRule(text: string): VaguePromptRule | undefined {
  const hay = text.toLowerCase();
  return loadVagueRules().find((rule) => {
    const parts = rule.match.split("|");
    return parts.some((p) => hay.includes(p.trim()));
  });
}

export function inferPageTypeFromProduct(productDescription: string, fallback: string): string {
  const rule = matchVagueRule(productDescription);
  if (rule?.pageType) return rule.pageType;
  return fallback;
}

export function resolveColorGuidance(pageType: string, productDescription?: string): ColorGuidance {
  const pattern = loadPattern(pageType);
  const principles = loadPrinciples();
  const semanticTokens = colorCraftData.semanticTokens as { cssTemplate: string; notes: string[] };

  const agentInstructions = [
    `Palette direction (${pattern.label}): ${pattern.palette}`,
    ...pattern.do.map((d) => `Do: ${d}`),
    ...pattern.avoid.map((a) => `Avoid: ${a}`),
    ...semanticTokens.notes.map((n) => `Token: ${n}`),
  ];

  if (productDescription?.trim()) {
    agentInstructions.unshift(`Product color fit: choices must serve "${productDescription.trim().slice(0, 100)}"`);
  }

  return { principles, pattern, semanticTokens, agentInstructions };
}

/** Expand "create pricing cards" into a senior craft brief + color direction. */
export function enrichProductRequest(opts: {
  pageType: string;
  productDescription?: string;
}): ProductEnrichment {
  const raw = opts.productDescription?.trim() ?? "";
  const wasVague = isVagueProductRequest(raw);
  const rule = raw ? matchVagueRule(raw) : undefined;

  const pageType =
    wasVague && rule?.pageType ? rule.pageType : opts.pageType;

  let productDescription = raw;
  if (wasVague) {
    const expansion = rule?.expansion ?? (colorCraftData.defaultVagueExpansion as string);
    productDescription = raw
      ? `${raw} — ${expansion}`
      : expansion;
  }

  return {
    productDescription,
    wasVague,
    inferredPageType: wasVague && rule?.pageType ? rule.pageType : undefined,
    colorGuidance: resolveColorGuidance(pageType, productDescription),
  };
}

export function colorCraftForBrief(pageType: string, profile?: PageTypeProfile): string[] {
  const guidance = resolveColorGuidance(pageType);
  const lines = [
    `**${guidance.pattern.label}** — ${guidance.pattern.palette}`,
    "",
    "**Principles**",
    ...guidance.principles.map((p) => `- ${p.rule}`),
    "",
    "**Do**",
    ...guidance.pattern.do.map((d) => `- ${d}`),
    "",
    "**Avoid**",
    ...guidance.pattern.avoid.map((a) => `- ${a}`),
    "",
    "**Semantic tokens (start here)**",
    "```css",
    guidance.semanticTokens.cssTemplate.trim(),
    "```",
    ...guidance.semanticTokens.notes.map((n) => `- ${n}`),
  ];

  if (profile?.layoutPatterns.some((p) => p.toLowerCase().includes("monochrome"))) {
    lines.push("", "_Page type hints monochrome + one accent — respect that._");
  }

  return lines;
}
