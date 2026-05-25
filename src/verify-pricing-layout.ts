import type { Page } from "playwright";

export type PricingLayoutAudit = {
  isPlanCard: boolean;
  headerTopCramped: boolean;
  toggleFlushToHeader: boolean;
  billingOrderWrong: boolean;
  notes: string[];
};

/** Contextual layout audit — only fires on single plan-card pattern (header band + billing toggle + price). */
export async function auditPricingLayout(
  page: Page,
  pageType?: string,
): Promise<PricingLayoutAudit> {
  return page.evaluate((pt) => {
    const bodyHay = document.body.innerText.slice(0, 800).toLowerCase();
    const isPricing =
      pt === "pricing" ||
      /annual|monthly|billed annually|per editor|pricing|plan tier/.test(bodyHay);

    const toggle = document.querySelector(
      '.billing-toggle, [role="group"][aria-label*="billing" i]',
    );
    const card = document.querySelector(".card, article.card, [class*='pricing-card']");
    const header = document.querySelector(
      ".card-header, header[data-material], .plan-header, .tier-header",
    );
    const priceEl = document.querySelector(
      "number-flow, .price-heading, .price-block, [class*='price-heading']",
    );

    const isPlanCard = isPricing && !!toggle && !!card && (!!header || !!priceEl);

    if (!isPlanCard) {
      return {
        isPlanCard: false,
        headerTopCramped: false,
        toggleFlushToHeader: false,
        billingOrderWrong: false,
        notes: [] as string[],
      };
    }

    const notes: string[] = [];
    let headerTopCramped = false;
    let toggleFlushToHeader = false;
    let billingOrderWrong = false;

    if (header) {
      const hs = getComputedStyle(header);
      const padTop = parseFloat(hs.paddingTop);
      const padLeft = parseFloat(hs.paddingLeft);
      const tierTitle = header.querySelector("h1, .tier-name, [class*='tier-name']");
      if (tierTitle) {
        const titleRect = tierTitle.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const topInset = titleRect.top - headerRect.top;
        if (topInset < 14 || padTop < padLeft * 0.75) {
          headerTopCramped = true;
          notes.push(
            `Senior: tier title cramped to header top (${Math.round(topInset)}px inset — need breathing room)`,
          );
        }
      }
    }

    const body =
      card?.querySelector(".card-body, .plan-body") ??
      (toggle?.parentElement?.classList.contains("card-body") ? toggle.parentElement : null);

    if (body && toggle) {
      const bs = getComputedStyle(body);
      const bodyPadTop = parseFloat(bs.paddingTop);
      const toggleRect = toggle.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const toggleTopInset = toggleRect.top - bodyRect.top;

      if (bodyPadTop < 8 && toggleTopInset < 12) {
        toggleFlushToHeader = true;
        notes.push(
          "Senior: billing toggle flush to card body top — add top padding or gap after header band",
        );
      }

      if (header) {
        const headerRect = header.getBoundingClientRect();
        const seamGap = toggleRect.top - headerRect.bottom;
        if (seamGap < 10) {
          toggleFlushToHeader = true;
          if (!notes.some((n) => n.includes("vertical rhythm"))) {
            notes.push(
              `Senior: no vertical rhythm between header band and billing toggle (${Math.round(seamGap)}px gap)`,
            );
          }
        }
      }
    }

    const buttons = toggle?.querySelectorAll("button") ?? [];
    if (buttons.length >= 2) {
      const labels = [...buttons].map((b) => b.textContent?.trim().toLowerCase() ?? "");
      const annualIdx = labels.findIndex((l) => l.includes("annual"));
      const monthlyIdx = labels.findIndex((l) => l.includes("monthly"));
      if (annualIdx === 0 && monthlyIdx === 1) {
        billingOrderWrong = true;
        notes.push(
          "Senior: plan card billing order — Monthly before Annual reads natural (Annual is the alternate option)",
        );
      }
    }

    return {
      isPlanCard,
      headerTopCramped,
      toggleFlushToHeader,
      billingOrderWrong,
      notes,
    };
  }, pageType ?? "");
}
