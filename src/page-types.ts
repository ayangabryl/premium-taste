import pageTypesData from "../corpus/page-types.json";
import techniquesData from "../corpus/techniques.json";
import type { CreativeReference, PageTypeProfile, CreativeTechnique } from "./types";

export function loadPageTypes(): PageTypeProfile[] {
  return pageTypesData.pageTypes as PageTypeProfile[];
}

export function getPageType(id: string): PageTypeProfile | undefined {
  return loadPageTypes().find((p) => p.id === id.toLowerCase());
}

export function loadTechniques(): CreativeTechnique[] {
  return techniquesData.techniques as CreativeTechnique[];
}

export function findTechniques(opts: {
  ids?: string[];
  pageType?: string;
  limit?: number;
}): CreativeTechnique[] {
  let list = loadTechniques();

  if (opts.pageType) {
    list = list.filter((t) => t.applyTo.includes(opts.pageType!));
  }

  if (opts.ids?.length) {
    const set = new Set(opts.ids.map((i) => i.toLowerCase()));
    list = list.filter((t) => set.has(t.id.toLowerCase()));
  }

  return list.slice(0, opts.limit ?? 4);
}

export function techniquesForPageType(pageTypeId: string, refs: CreativeReference[]): CreativeTechnique[] {
  const profile = getPageType(pageTypeId);
  const fromProfile = profile
    ? findTechniques({ ids: profile.techniqueIds, pageType: pageTypeId, limit: 4 })
    : [];

  if (fromProfile.length >= 2) return fromProfile;

  const fromRefs = refs
    .map((r) => findTechniques({ ids: ["editorial-asymmetry"], pageType: pageTypeId })[0])
    .filter(Boolean) as CreativeTechnique[];

  const merged = [...fromProfile];
  for (const t of fromRefs) {
    if (!merged.some((m) => m.id === t.id)) merged.push(t);
  }

  return merged.slice(0, 4);
}

export function pickCreativeTechniques(pageTypeId: string, count = 3): CreativeTechnique[] {
  const pool = findTechniques({ pageType: pageTypeId });
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
