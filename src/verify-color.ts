import type { Page } from "playwright";
import type { ColorVerifyResult } from "./types";

export async function verifyColorMaterial(page: Page): Promise<ColorVerifyResult> {
  const evidence: string[] = [];
  let score = 0;
  const maxScore = 5;

  const metrics = await page.evaluate(() => {
    const parseRgb = (color: string): [number, number, number] | null => {
      const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return [+m[1]!, +m[2]!, +m[3]!];
    };

    const rootStyle = getComputedStyle(document.documentElement);
    const tokenNames = ["--surface", "--ink", "--muted", "--border", "--accent", "--paper"];
    const semanticTokens = tokenNames.some((name) => {
      const v = rootStyle.getPropertyValue(name).trim();
      return v.length > 0;
    });

    const bodyBg = parseRgb(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255];
    const textEls = [...document.querySelectorAll("p, li, span, small, label, h1, h2, h3, button, a")].slice(
      0,
      40,
    );

    let minBodyContrast = 999;
    let hasMutedStep = false;

    for (const el of textEls) {
      const text = el.textContent?.trim() ?? "";
      if (text.length < 2) continue;
      const color = getComputedStyle(el).color;
      const rgb = parseRgb(color);
      if (!rgb) continue;
      const lumText = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      const lumBg = 0.2126 * bodyBg[0] + 0.7152 * bodyBg[1] + 0.0722 * bodyBg[2];
      const ratio =
        (Math.max(lumText, lumBg) + 5) / (Math.min(lumText, lumBg) + 5);
      if (ratio < minBodyContrast) minBodyContrast = ratio;
      if (lumText > 80 && lumText < 180) hasMutedStep = true;
    }

    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const fullBleedGradient = [...document.querySelectorAll("body, main")].some((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg.includes("gradient")) return false;
      const rect = el.getBoundingClientRect();
      return rect.height > vh * 0.55 && rect.width > vw * 0.9;
    });

    const containedMaterial =
      !!document.querySelector("[data-material], [data-premium-material], .material-header, .card-header") ||
      [...document.querySelectorAll("*")].some((el) => {
        const bg = getComputedStyle(el).backgroundImage;
        if (!bg.includes("gradient")) return false;
        const rect = el.getBoundingClientRect();
        return rect.height > 0 && rect.height < vh * 0.42 && rect.width < vw * 0.92;
      });

    return {
      semanticTokens,
      minBodyContrast: minBodyContrast === 999 ? 0 : minBodyContrast,
      hasMutedStep,
      fullBleedGradient,
      containedMaterial,
    };
  });

  if (metrics.semanticTokens) {
    score += 1;
    evidence.push("Semantic color tokens (--surface, --ink, --muted, etc.)");
  } else {
    evidence.push("Define CSS custom properties for neutrals — see brief color section");
  }

  if (metrics.hasMutedStep) {
    score += 1;
    evidence.push("Muted text step present — hierarchy by value");
  } else {
    evidence.push("Add quieter secondary text color for meta/labels");
  }

  const contrastOk = metrics.minBodyContrast >= 4.5;
  if (contrastOk) {
    score += 1;
    evidence.push(`Text contrast OK (~${metrics.minBodyContrast.toFixed(1)}:1 on body)`);
  } else if (metrics.minBodyContrast >= 3) {
    score += 0.5;
    evidence.push(`Contrast borderline (${metrics.minBodyContrast.toFixed(1)}:1) — aim ≥4.5:1 on body copy`);
  } else {
    evidence.push(`Low text contrast (${metrics.minBodyContrast.toFixed(1)}:1) — fix ink/muted on surface`);
  }

  if (!metrics.fullBleedGradient || metrics.containedMaterial) {
    score += 1;
    if (metrics.containedMaterial) evidence.push("Gradient/material in contained zone — not full-page wallpaper");
    else evidence.push("No full-bleed decorative gradient on body/main");
  } else {
    evidence.push("Full-bleed gradient on body/main — confine material to one zone");
  }

  if (metrics.semanticTokens && metrics.hasMutedStep && contrastOk) {
    score += 1;
    evidence.push("Premium color discipline — tokens + hierarchy + contrast");
  }

  score = Math.min(maxScore, Math.round(score * 2) / 2);

  return {
    semanticTokens: metrics.semanticTokens,
    mutedHierarchy: metrics.hasMutedStep,
    contrastOk,
    containedMaterial: metrics.containedMaterial || !metrics.fullBleedGradient,
    score,
    maxScore,
    evidence,
  };
}
