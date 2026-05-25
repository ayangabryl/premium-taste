import tastesData from "../corpus/tastes.json";
import type { CreativeTaste } from "./types";
import { findTechniques } from "./page-types";
import { getPageType } from "./page-types";

export function loadTastes(): CreativeTaste[] {
  return tastesData.tastes as CreativeTaste[];
}

export function getTaste(id: string): CreativeTaste | undefined {
  return loadTastes().find((t) => t.id === id.toLowerCase());
}

/** Resolve taste: explicit id, page type default, or spectacle fallback */
export function resolveTaste(tasteId?: string, pageType?: string): CreativeTaste {
  if (tasteId && tasteId !== "auto") {
    const t = getTaste(tasteId);
    if (t) return t;
  }

  if (pageType) {
    const profile = getPageType(pageType);
    if (profile?.defaultTaste) {
      const fromPage = getTaste(profile.defaultTaste);
      if (fromPage) return fromPage;
    }
  }

  return getTaste("spectacle") ?? loadTastes()[0]!;
}

export function pickTechniquesForTaste(pageTypeId: string, taste: CreativeTaste, count = 3) {
  const fromTaste = findTechniques({ ids: taste.techniqueIds, pageType: pageTypeId, limit: count });
  if (fromTaste.length >= count) return fromTaste.slice(0, count);

  const profile = getPageType(pageTypeId);
  const fromPage = profile
    ? findTechniques({ ids: profile.techniqueIds, pageType: pageTypeId, limit: count })
    : [];

  const merged = [...fromTaste];
  for (const t of fromPage) {
    if (!merged.some((m) => m.id === t.id)) merged.push(t);
  }
  return merged.slice(0, count);
}

export function juryWeightsForTaste(taste: CreativeTaste): { id: string; title: string; weight: number }[] {
  const titles: Record<string, string> = {
    interaction: "Interaction craft",
    typography: "Typography",
    colorMaterial: "Color & material",
    motion: "Motion",
    layout: "Layout & composition",
    concept: "Concept clarity",
  };

  return Object.entries(taste.juryWeights).map(([id, weight]) => ({
    id,
    title: titles[id] ?? id,
    weight,
  }));
}
