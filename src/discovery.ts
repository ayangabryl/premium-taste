import discoveryData from "../corpus/product-discovery.json";
import principlesData from "../corpus/craft-principles.json";
import type { PageTypeProfile } from "./types";
import { getPageType } from "./page-types";

export type DiscoveryQuestion = {
  id: string;
  prompt: string;
  blocksConceptUntilAnswered?: boolean;
};

export type CraftPrinciple = {
  id: string;
  name: string;
  question: string;
  applyTo: string[];
};

export function loadDiscoveryQuestions(pageType: string): DiscoveryQuestion[] {
  const universal = discoveryData.universal as DiscoveryQuestion[];
  const byType = (discoveryData.byPageType as Record<string, DiscoveryQuestion[]>)[pageType] ?? [];
  return [...universal, ...byType];
}

export function loadCraftPrinciples(): CraftPrinciple[] {
  return principlesData.principles as CraftPrinciple[];
}

export function pickCraftPrinciples(pageType: string, count = 3): CraftPrinciple[] {
  const pool = loadCraftPrinciples().filter((p) => p.applyTo.includes(pageType));
  const fallback = loadCraftPrinciples();
  const source = pool.length >= count ? pool : fallback;
  return [...source].sort(() => Math.random() - 0.5).slice(0, count);
}

/** Functional fit constraints — what the screen must DO, not how it should look. */
export function fitConstraintsFor(pageType: string, productDescription?: string): string[] {
  const profile = getPageType(pageType);
  const set = new Set<string>(profile?.requiredElements ?? []);
  const hay = (productDescription ?? "").toLowerCase();

  if (pageType === "auth" || hay.match(/otp|2fa|passcode|authenticator|verify code/)) {
    set.add("Single task — no marketing hero above the form");
    set.add("Digit focus, auto-advance, and paste must work");
    set.add("Background may respond to state — must not be static wallpaper");
  }
  if (pageType === "portfolio" || hay.match(/portfolio|resume|cv|freelance/)) {
    set.add("Identity clear without dark scrub hero template");
    set.add("At least one memorable hover or preview moment");
  }
  if (pageType === "hero" || hay.match(/launch|saas|startup|waitlist/)) {
    set.add("One idea in 5 seconds — not feature grid");
    set.add("Primary action obvious without pill-button template");
  }
  if (pageType === "pricing" || hay.match(/pricing|plan|tier|subscription|billing/)) {
    set.add("Plan hierarchy clear — price typography dominates");
    set.add("Color material in card header or tier zone — not full-page gradient");
    set.add("Semantic neutrals + one accent CTA");
    set.add("Billing toggle or tier hover if comparison UI");
  }

  for (const d of profile?.interactionDefaults ?? []) {
    if (!d.toLowerCase().includes("gsap")) set.add(d);
  }

  return [...set];
}

export function originalityTestPrompt(profile?: PageTypeProfile): string {
  return [
    "Before any code, finish honestly:",
    '"This looks like ___ with different copy."',
    "If you can name a reference, competitor, or template → reject and restart.",
    profile ? `This is a ${profile.label} — the concept must fit that job, not a cool pattern.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function similarityTrapsForReferences(refNames: string[]): string[] {
  const traps: Record<string, string> = {
    "Follow.Art": "Orange field + stretched Bebas + hand X mark",
    iyO: "Concentric rings on black — moiré segment 404",
    "Missing Element": "Deep-sea cinematic + corner meta chrome",
    Maxima: "Illustration system clone",
  };
  return refNames.map((n) => traps[n] ?? `Surface layout of ${n}`).map((t) => `Do not copy: ${t}`);
}
