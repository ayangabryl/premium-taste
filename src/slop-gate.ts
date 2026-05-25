import type { SlopVerifyResult } from "./types";
import { auditEmDashCopy } from "./assets";
import { auditTaskUiTypography } from "./typography";

const SLOP_FONTS = /\b(syne|space grotesk|plus jakarta|dm sans|outfit|inter|geist|cal sans)\b/i;

const SLOP_COPY =
  /\b(build the thing|before the meeting|without friction|revolutioniz|game.?chang|vibe cod|10x|supercharge|unlock|nexus|saas template|production front-end|proof panel|density tokens)\b/i;

export async function verifySlop(
  page: import("playwright").Page,
  opts?: { pageType?: string; productDescription?: string },
): Promise<SlopVerifyResult> {
  const evidence: string[] = [];
  let flags = 0;

  const signals = await page.evaluate(() => {
    const h1 = document.querySelector("h1, .display-404");
    const h1Font = h1 ? getComputedStyle(h1).fontFamily : "";
    const main = document.querySelector("main") ?? document.body;
    const bodyText = main.innerText.slice(0, 2000);

    const pillCta = [...document.querySelectorAll("a, button")].some((el) => {
      const s = getComputedStyle(el);
      const r = parseFloat(s.borderRadius);
      return r > 24 && (el.textContent?.length ?? 0) < 40;
    });

    const splitSaaS = (() => {
      const main = document.querySelector("main");
      if (!main) return false;
      const style = getComputedStyle(main);
      if (style.display !== "grid") return false;
      const cols = style.gridTemplateColumns;
      const hasCopy = !!document.querySelector(".copy, [class*='copy']");
      const hasVisual = !!document.querySelector(".hero-visual, [class*='visual']");
      return cols.includes("fr") && hasCopy && hasVisual && cols.split(" ").length >= 2;
    })();

    const orbitalNodes = !!document.querySelector(".orbit, [class*='orbit'], [class*='node-network']");

    const dotGrid = [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some(
          (r) => r.cssText.includes("radial-gradient") && r.cssText.includes("1px"),
        );
      } catch {
        return false;
      }
    });

    const purpleBlob = [...document.querySelectorAll("body, main")].some((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (!/rgba?\(\s*1?\d{2}\s*,\s*\d+\s*,\s*2[0-5]\d/.test(bg) || !bg.includes("gradient")) return false;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      return rect.height > vh * 0.55 && rect.width > vw * 0.88;
    });

    const goldCopperGlow = [...document.querySelectorAll("*")].some((el) => {
      const s = getComputedStyle(el);
      const shadow = s.boxShadow;
      return /rgba?\(\s*2?\d{2}\s*,\s*1?\d{2}\s*,\s*[4-9]\d/.test(shadow) && shadow !== "none";
    });

    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const bodyDark = (() => {
      const m = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      const lum = 0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3];
      return lum < 40;
    })();

    const customCursor = getComputedStyle(document.body).cursor === "none" &&
      !!document.querySelector(".cursor-dot, .cursor-ring, .cursor, [id*='cursor']");

    const devConsoleUi =
      bodyDark &&
      (!!document.querySelector(".console, [class*='console'], [aria-label*='proof' i]") ||
        /\b(density tokens|proof panel|status · available)\b/i.test(document.body.innerText.slice(0, 2500)));

    return {
      h1Font,
      bodyText,
      pillCta,
      splitSaaS,
      orbitalNodes,
      dotGrid,
      purpleBlob,
      goldCopperGlow,
      devConsoleUi,
      customCursor,
    };
  });

  if (SLOP_FONTS.test(signals.h1Font)) {
    flags += 1;
    evidence.push(`Slop font detected in headline: ${signals.h1Font.split(",")[0]}`);
  }

  if (SLOP_COPY.test(signals.bodyText)) {
    flags += 1;
    evidence.push("Marketing buzzword copy detected");
  }

  const emDash = auditEmDashCopy(signals.bodyText);
  if (emDash.flagged) {
    flags += 1;
    evidence.push(...emDash.evidence.length ? emDash.evidence : [`Em dash in UI copy (${emDash.count}) — use periods instead`]);
  }

  if (signals.pillCta) {
    flags += 1;
    evidence.push("Pill-shaped primary CTA — template SaaS pattern");
  }

  if (signals.splitSaaS) {
    flags += 1;
    evidence.push("Split SaaS hero (copy + decorative visual columns)");
  }

  if (signals.orbitalNodes) {
    flags += 1;
    evidence.push("Orbital node network — generic AI hero visual");
  }

  if (signals.dotGrid) {
    flags += 1;
    evidence.push("Dot grid background");
  }

  if (signals.purpleBlob) {
    flags += 1;
    evidence.push("Full-bleed purple/violet gradient on body/main — use contained material zone instead");
  }

  if (signals.goldCopperGlow) {
    flags += 1;
    evidence.push("Decorative glow shadow — jury would flag as template premium");
  }

  if (signals.devConsoleUi) {
    flags += 1;
    evidence.push("Dark developer console portfolio — zinc field + proof panel cliché");
  }

  if (signals.customCursor) {
    flags += 1;
    evidence.push("Custom cursor stack — decorative unless concept demands it");
  }

  const taskType = await auditTaskUiTypography(page, opts?.pageType, opts?.productDescription);
  if (taskType.serifOnTaskUi) {
    flags += 1;
    evidence.push(...taskType.evidence);
  }

  const clean = flags === 0;
  if (clean) evidence.push("No common AI slop patterns detected");

  return { clean, flags, evidence };
}
