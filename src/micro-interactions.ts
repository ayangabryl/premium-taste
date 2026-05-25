import microData from "../corpus/micro-interactions.json";

export type MicroInteractionGuidance = {
  principles: string[];
  mustHave: string[];
  antiPatterns: string[];
  libraries?: Record<string, string>;
  proactiveSuggestions: string[];
};

const PRICING_HINT =
  /pricing|price card|plan card|subscription|tier|billing|annual|monthly/i;

export function resolveMicroInteractions(pageType: string, productDescription?: string): MicroInteractionGuidance {
  const principles = (microData.principles as { rule: string }[]).map((p) => p.rule);
  const byContext = microData.byContext as Record<
    string,
    { mustHave: string[]; planCardLayout?: string[]; libraries?: Record<string, string> }
  >;
  const ctx = byContext[pageType] ?? byContext.default!;
  const antiPatterns = (microData.antiPatterns as string[]) ?? [];
  const proactiveSuggestions = buildProactiveSuggestions(pageType, productDescription, ctx, antiPatterns);

  return {
    principles,
    mustHave: ctx.mustHave,
    antiPatterns,
    libraries: ctx.libraries,
    proactiveSuggestions,
  };
}

function buildProactiveSuggestions(
  pageType: string,
  productDescription: string | undefined,
  ctx: { mustHave: string[]; planCardLayout?: string[]; libraries?: Record<string, string> },
  antiPatterns: string[],
): string[] {
  const hay = productDescription ?? "";
  const isPricing = pageType === "pricing" || PRICING_HINT.test(hay);
  const out: string[] = [];

  if (isPricing) {
    out.push(
      "**NumberFlow** on billing toggle — `number-flow` (vanilla) or `@number-flow/react`. Digits morph 15→25; do NOT swap textContent.",
    );
    out.push("Layer micro-motion: toggle pressed state + meta line crossfade + header material hue shift.");
    if (/plan card|single tier|plus card|price card|framer/i.test(hay) || pageType === "pricing") {
      for (const rule of ctx.planCardLayout ?? []) {
        out.push(rule);
      }
    }
    if (ctx.libraries?.vanilla) {
      out.push(`Docs: ${ctx.libraries.vanilla.split(" — ")[0]}`);
    }
  }

  if (/count|metric|stat|dashboard|analytics/i.test(hay) || pageType === "landing") {
    out.push("Any number that changes with user action should morph (NumberFlow) — not instant replace.");
  }

  for (const item of ctx.mustHave) {
    if (!out.some((o) => o.toLowerCase().includes(item.slice(0, 24).toLowerCase()))) {
      out.push(item);
    }
  }

  out.push("Document which micro-interactions you will ship in `.premium-taste/discovery.md` before layout code.");
  out.push("Ship without state-change feedback = incomplete — layout alone is not senior craft.");
  out.push("AVOID layout-shift hovers: no translateY lift on CTA, no translateX on list rows — tint/color/shadow only.");

  for (const bad of antiPatterns.slice(0, 2)) {
    out.push(`Do not: ${bad}`);
  }

  return out;
}

export function formatMicroCliBlock(guidance: MicroInteractionGuidance): string[] {
  const lines = ["", "micro (required — Premium Taste suggests this for you):", ""];
  for (const s of guidance.proactiveSuggestions) {
    lines.push(`  → ${s.replace(/\*\*/g, "")}`);
  }
  if (guidance.libraries) {
    lines.push("");
    lines.push("  libraries:");
    for (const [k, v] of Object.entries(guidance.libraries)) {
      lines.push(`    ${k}: ${v}`);
    }
  }
  return lines;
}

export function microFitConstraints(pageType: string, productDescription?: string): string[] {
  const m = resolveMicroInteractions(pageType, productDescription);
  const constraints = [...m.mustHave.slice(0, 3)];
  if (pageType === "pricing" || PRICING_HINT.test(productDescription ?? "")) {
    constraints.unshift("NumberFlow (or odometer) on price — mandatory for pricing pages");
  }
  return constraints;
}
