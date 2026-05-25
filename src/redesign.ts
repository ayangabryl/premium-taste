import redesignData from "../corpus/redesign-workflow.json";

export type RedesignWorkflow = {
  detected: boolean;
  locateTarget: string[];
  photoHandling: string[];
  preserve: string[];
  upgrade: string[];
  documentSections: string[];
  documentPath: string;
  expansion?: string;
};

const DETECT_RE =
  /\b(redesign|restyle|revamp|re-do|redo this|upgrade this|polish this|make this premium|make this look|not look like ai|with a photo|with this photo|using a photo|using this photo|attached photo|attached image|this screenshot|from the screenshot|with the image|redesign this)\b/i;

export function isRedesignRequest(productDescription?: string): boolean {
  const raw = productDescription?.trim() ?? "";
  if (!raw) return false;
  return DETECT_RE.test(raw);
}

export function resolveRedesignWorkflow(productDescription?: string): RedesignWorkflow {
  const detected = isRedesignRequest(productDescription);
  const base = {
    detected,
    locateTarget: redesignData.locateTarget as string[],
    photoHandling: redesignData.photoHandling as string[],
    preserve: redesignData.preserve as string[],
    upgrade: redesignData.upgrade as string[],
    documentSections: redesignData.documentSections as string[],
    documentPath: redesignData.documentIn as string,
  };

  if (!detected) return base;

  return {
    ...base,
    expansion: redesignData.expansion as string,
  };
}

/** Append redesign craft direction to product description for brief. */
export function applyRedesignEnrichment(productDescription: string): string {
  if (!isRedesignRequest(productDescription)) return productDescription;
  const expansion = redesignData.expansion as string;
  if (productDescription.includes(expansion.slice(0, 40))) return productDescription;
  return `${productDescription} — ${expansion}`;
}

export function redesignFitConstraints(): string[] {
  return [
    "Redesign existing files in project — do not create a throwaway duplicate page",
    "Document target files and photo path in .premium-taste/discovery.md before coding",
    "Preserve route, primary action, and working behavior",
    "Photo used as bounded visual anchor — not full-page blur wallpaper",
  ];
}
