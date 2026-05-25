import { describe, expect, test } from "bun:test";
import { chromium } from "playwright";
import { auditPricingLayout } from "../src/verify-pricing-layout";

const crampedPlanCard = `<!doctype html>
<html><head><style>
  .card-header { padding: 0.5rem 1.75rem 1rem; }
  .card-body { padding: 0 1.75rem 1.75rem; }
</style></head><body>
<article class="card">
  <header class="card-header" data-material><h1 class="tier-name">Plus</h1></header>
  <div class="card-body">
    <div class="billing-toggle" role="group" aria-label="Billing period">
      <button aria-pressed="true">Annual</button>
      <button aria-pressed="false">Monthly</button>
    </div>
    <number-flow class="price-flow"></number-flow>
  </div>
</article>
</body></html>`;

const fixedPlanCard = `<!doctype html>
<html><head><style>
  .card-header { padding: 2rem 1.75rem 1.625rem; }
  .card-body { padding: 1.25rem 1.75rem 1.75rem; }
</style></head><body>
<article class="card">
  <header class="card-header" data-material><h1 class="tier-name">Plus</h1></header>
  <div class="card-body">
    <div class="billing-toggle" role="group" aria-label="Billing period">
      <button aria-pressed="false">Monthly</button>
      <button aria-pressed="true">Annual</button>
    </div>
    <number-flow class="price-flow"></number-flow>
  </div>
</article>
</body></html>`;

describe("auditPricingLayout", () => {
  test("flags cramped plan card spacing and annual-first toggle order", async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(crampedPlanCard);
    const audit = await auditPricingLayout(page, "pricing");
    await browser.close();

    expect(audit.isPlanCard).toBe(true);
    expect(audit.headerTopCramped).toBe(true);
    expect(audit.toggleFlushToHeader).toBe(true);
    expect(audit.billingOrderWrong).toBe(true);
    expect(audit.notes.length).toBeGreaterThanOrEqual(3);
  });

  test("passes fixed plan card layout", async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(fixedPlanCard);
    const audit = await auditPricingLayout(page, "pricing");
    await browser.close();

    expect(audit.isPlanCard).toBe(true);
    expect(audit.headerTopCramped).toBe(false);
    expect(audit.toggleFlushToHeader).toBe(false);
    expect(audit.billingOrderWrong).toBe(false);
    expect(audit.notes).toEqual([]);
  });

  test("skips non plan-card pricing pages", async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(`<main><h1>Pricing</h1><p>Three tiers in a grid</p></main>`);
    const audit = await auditPricingLayout(page, "pricing");
    await browser.close();

    expect(audit.isPlanCard).toBe(false);
    expect(audit.notes).toEqual([]);
  });
});
