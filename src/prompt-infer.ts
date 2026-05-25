import { inferPageTypeFromProduct, matchVagueRule } from "./color-craft";

/** Infer scoring page type from the user's single prompt — no manual -t needed. */
export function inferPageTypeFromPrompt(prompt: string, fallback = "landing"): string {
  const rule = matchVagueRule(prompt);
  if (rule?.pageType) return rule.pageType;

  const hay = prompt.toLowerCase();
  if (/404|not found|error page|page not found/.test(hay)) return "404";
  if (/pric(?:ing|e\s*card|ing\s*card)|prcing|pricng|price card|plan card|subscription|billing|tier/.test(hay)) return "pricing";
  if (/portfolio|resume|cv|freelance|personal site/.test(hay)) return "portfolio";
  if (/otp|passcode|2fa|sign in|sign up|login|password reset|auth/.test(hay)) return "auth";
  if (/empty state|no results|zero data/.test(hay)) return "empty-state";
  if (/hero|above the fold|waitlist launch/.test(hay)) return "hero";

  return inferPageTypeFromProduct(prompt, fallback);
}
