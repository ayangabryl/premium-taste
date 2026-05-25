import type { Page } from "playwright";

export type MicroCraftAudit = {
  liftHover: boolean;
  rowSlideHover: boolean;
  numberFlowPresent: boolean;
  billingTogglePresent: boolean;
  numberFlowExpected: boolean;
  numberFlowMissing: boolean;
  notes: string[];
};

export async function auditMicroCraft(
  page: Page,
  pageType?: string,
): Promise<MicroCraftAudit> {
  const signals = await page.evaluate((pt) => {
    let css = "";
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) css += rule.cssText + "\n";
      } catch {
        /* cross-origin */
      }
    }
    for (const el of document.querySelectorAll("style")) {
      css += el.textContent ?? "";
    }

    const liftHover =
      /:hover[^}]*transform:[^;]*translateY\s*\(\s*-/i.test(css) ||
      /:hover[^}]*translateY\s*\(\s*-\d/i.test(css);

    const rowSlideHover =
      /(?:li|\.features[^,{]*)\s*:hover[^}]*translateX/i.test(css) ||
      /:hover[^}]*translateX\s*\(\s*\d/i.test(css);

    const numberFlowPresent = !!document.querySelector("number-flow");
    const billingTogglePresent =
      !!document.querySelector(".billing-toggle, [aria-pressed='true'], [aria-pressed='false']") ||
      !!document.querySelector('[role="group"][aria-label*="billing" i]');

    const bodyHay = document.body.innerText.slice(0, 800).toLowerCase();
    const isPricing =
      pt === "pricing" ||
      /annual|monthly|per editor|billed annually|pricing|plan tier/.test(bodyHay);

    return {
      liftHover,
      rowSlideHover,
      numberFlowPresent,
      billingTogglePresent,
      isPricing,
    };
  }, pageType ?? "");

  const numberFlowExpected = signals.isPricing && signals.billingTogglePresent;
  const numberFlowMissing = numberFlowExpected && !signals.numberFlowPresent;
  const notes: string[] = [];

  if (signals.liftHover) {
    notes.push("Senior: translateY lift on hover — layout shift, kills premium (use color/shadow only)");
  }
  if (signals.rowSlideHover) {
    notes.push("Senior: translateX slide on row hover — jittery, avoid on pricing lists");
  }
  if (numberFlowMissing) {
    notes.push("Senior: billing toggle without NumberFlow — price should morph, not textContent swap");
  }
  if (signals.numberFlowPresent && numberFlowExpected) {
    notes.push("NumberFlow present on price — good micro craft");
  }

  return {
    liftHover: signals.liftHover,
    rowSlideHover: signals.rowSlideHover,
    numberFlowPresent: signals.numberFlowPresent,
    billingTogglePresent: signals.billingTogglePresent,
    numberFlowExpected,
    numberFlowMissing,
    notes,
  };
}
