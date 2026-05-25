import { chromium, type Browser, type Page } from "playwright";
import { verifySlop } from "./slop-gate";
import { verifyColorMaterial } from "./verify-color";
import type {
  ColorVerifyResult,
  InteractionVerifyResult,
  MotionVerifyResult,
  VisualVerifyResult,
} from "./types";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser) browser = await chromium.launch({ headless: true });
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function verifyVisual(page: Page, profile: import("./types").VerifyProfile = "creative"): Promise<VisualVerifyResult> {
  const evidence: string[] = [];

  const metrics = await page.evaluate((verifyProfile) => {
    const systemFonts = /^(system-ui|ui-sans-serif|-apple-system|blinkmacsystemfont|segoe ui|roboto|helvetica|arial|sans-serif|inter)/i;

    const headings = [...document.querySelectorAll("h1, h2, .display-404, [class*='display']")];
    let maxFontPx = 0;
    for (const el of headings) {
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px > maxFontPx) maxFontPx = px;
    }

    const displayTypeScale = maxFontPx >= 56;

    let customTypography = false;
    for (const el of [...document.querySelectorAll("h1, h2, h3, .headline, .display-404")]) {
      const family = getComputedStyle(el).fontFamily.toLowerCase();
      const first = family.split(",")[0]?.trim().replace(/['"]/g, "") ?? "";
      if (first && !systemFonts.test(first)) {
        customTypography = true;
        break;
      }
    }

    const svgPaths = document.querySelectorAll("svg path, svg circle, svg ellipse, svg line").length;
    const hasCanvas = document.querySelectorAll("canvas").length > 0;
    const hasHeroImg = [...document.querySelectorAll("img")].some((img) => img.naturalWidth > 120);
    const hasBgImage = [...document.querySelectorAll("body, main, section, figure")].some((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      return bg.includes("url(");
    });
    const editorialIndex = document.querySelector(".index, [class*='entry'], .split-hero, .pane-code") !== null;

    const customAssets = svgPaths >= 4 || hasCanvas || hasHeroImg || hasBgImage || editorialIndex;

    const main = document.querySelector("main") ?? document.body;
    const mainStyle = getComputedStyle(main);
    const centeredFlex =
      (mainStyle.display === "flex" || mainStyle.display === "inline-flex") &&
      mainStyle.alignItems === "center" &&
      mainStyle.justifyContent === "center" &&
      mainStyle.flexDirection !== "row";

    const bodyStyle = getComputedStyle(document.body);
    const bodyCentered =
      (bodyStyle.display === "flex" || bodyStyle.display === "inline-flex") &&
      bodyStyle.alignItems === "center" &&
      bodyStyle.justifyContent === "center";

    const gridLayout = mainStyle.display === "grid" || mainStyle.display === "inline-grid";
    const splitLayout =
      gridLayout &&
      (mainStyle.gridTemplateColumns.includes(" ") || mainStyle.gridTemplateColumns.includes("fr"));
    const hasVisualAnchor =
      document.querySelector(
        "svg, canvas, figure, .hero-visual, .visual, [class*='visual'], aside img, .scene, .index, [data-rule], .split-hero",
      ) !== null;
    const asymmetricHint =
      splitLayout ||
      hasVisualAnchor ||
      document.querySelector("[class*='meta'], [class*='corner'], .type-col, .scene") !== null ||
      maxFontPx >= 96;

    const listRows = document.querySelectorAll(
      "li, [class*='row'], [class*='entry'], [class*='list'] > *, .ticker span",
    ).length;
    const narrowMain = (() => {
      const col = document.querySelector("main, article, .content, body > div");
      if (!col) return false;
      const w = parseFloat(getComputedStyle(col).maxWidth);
      return w > 0 && w <= 720;
    })();

    let editorialLayout: boolean;
    if (verifyProfile === "editorial") {
      editorialLayout = narrowMain || listRows >= 3 || !centeredFlex;
    } else if (verifyProfile === "hero") {
      editorialLayout =
        splitLayout ||
        editorialIndex ||
        (hasVisualAnchor && !centeredFlex) ||
        (hasVisualAnchor && maxFontPx >= 48);
    } else if (verifyProfile === "404") {
      editorialLayout = !((centeredFlex || bodyCentered) && !asymmetricHint);
    } else {
      editorialLayout = !((centeredFlex || bodyCentered) && !asymmetricHint) || (hasVisualAnchor && splitLayout);
    }

    const accentFont = [...document.querySelectorAll("h2, h3, .eyebrow, [class*='section']")].some((el) => {
      const family = getComputedStyle(el).fontFamily.toLowerCase();
      const bodyFamily = getComputedStyle(document.body).fontFamily.toLowerCase();
      return family.split(",")[0]?.trim() !== bodyFamily.split(",")[0]?.trim();
    });
    const usesSystemIntentionally = [...document.querySelectorAll("body, main, p, a")].some((el) => {
      const family = getComputedStyle(el).fontFamily.toLowerCase();
      return (
        family.includes("-apple-system") ||
        family.includes("blinkmacsystemfont") ||
        family.includes("sf pro") ||
        family.includes("system-ui")
      );
    });

    return {
      maxFontPx,
      displayTypeScale,
      customTypography,
      svgPaths,
      customAssets,
      editorialLayout,
      centeredFlex,
      bodyCentered,
      listRows,
      narrowMain,
      accentFont,
      usesSystemIntentionally,
    };
  }, profile);

  if (profile === "editorial") {
    if (metrics.narrowMain) evidence.push("Narrow centered measure (editorial column)");
    else evidence.push("Missing narrow measure — editorial sites use ~36–42rem column");

    if (metrics.listRows >= 3) evidence.push(`List / row structure detected (${metrics.listRows} rows)`);
    else evidence.push("Add list sections — experience, work, experiments as rows");

    if (metrics.usesSystemIntentionally) evidence.push("System UI typography (SF Pro / -apple-system) — valid for editorial taste");
    else if (metrics.customTypography) evidence.push("Custom typography pairing detected");
    else evidence.push("Typography feels accidental — pick system UI OR intentional pairing");

    if (metrics.accentFont) evidence.push("Accent voice on section labels");
    if (metrics.customAssets) evidence.push(`Visual anchors present (SVG nodes: ${metrics.svgPaths})`);
    else evidence.push("Add one anchor — screenshot, bookshelf, or hover preview asset");

    if (metrics.editorialLayout || metrics.narrowMain) {
      evidence.push("Editorial layout — not template hero stack");
    } else {
      evidence.push("Layout reads as template — use narrow column + lists");
    }

    const editorialTypeOk = metrics.usesSystemIntentionally || metrics.customTypography || metrics.accentFont;
    const checks = [
      metrics.narrowMain || metrics.editorialLayout,
      metrics.listRows >= 3 || metrics.customAssets,
      editorialTypeOk,
      metrics.editorialLayout || metrics.narrowMain,
    ];
    const score = checks.filter(Boolean).length;

    return {
      displayTypeScale: metrics.displayTypeScale || metrics.maxFontPx >= 28,
      customTypography: editorialTypeOk,
      customAssets: metrics.customAssets,
      editorialLayout: metrics.editorialLayout || metrics.narrowMain,
      score,
      maxScore: 4,
      evidence,
    };
  }

  if (metrics.displayTypeScale) evidence.push(`Display type scale: ${Math.round(metrics.maxFontPx)}px`);
  else evidence.push(`Display type too small (${Math.round(metrics.maxFontPx)}px) — refs use monumental or generative type`);

  if (metrics.customTypography) evidence.push("Non-system display typography detected");
  else evidence.push("System-only typography — refs use intentional font pairing");

  if (metrics.customAssets) evidence.push(`Custom assets present (SVG nodes: ${metrics.svgPaths})`);
  else evidence.push("Weak assets — refs use illustration, moiré geometry, photo, or game surface");

  if (metrics.editorialLayout) evidence.push("Editorial/asymmetric layout (not template centered hero)");
  else evidence.push("Template centered hero pattern — refs rarely use icon+headline stack");

  const checks = [
    metrics.displayTypeScale,
    metrics.customTypography,
    metrics.customAssets,
    metrics.editorialLayout,
  ];
  const score = checks.filter(Boolean).length;

  return {
    displayTypeScale: metrics.displayTypeScale,
    customTypography: metrics.customTypography,
    customAssets: metrics.customAssets,
    editorialLayout: metrics.editorialLayout,
    score,
    maxScore: 4,
    evidence,
  };
}

export async function verifyMotion(page: Page): Promise<MotionVerifyResult> {
  const evidence: string[] = [];

  const gsapPresent = await page.evaluate(() => {
    const w = window as Window & { gsap?: unknown };
    return !!(w.gsap || document.querySelector("script[src*='gsap']"));
  });
  if (gsapPresent) evidence.push("GSAP detected on page");

  const sampleSelectors = ["h1", "canvas", "svg", "[data-animate]", ".ring", "main *", ".display-404", ".jelly"];
  let animatedElements = 0;

  for (const sel of sampleSelectors) {
    const el = await page.$(sel);
    if (!el) continue;

    const before = await el.evaluate((node) => {
      const s = getComputedStyle(node);
      return { transform: s.transform, opacity: s.opacity };
    });

    await page.waitForTimeout(450);

    const after = await el.evaluate((node) => {
      const s = getComputedStyle(node);
      return { transform: s.transform, opacity: s.opacity };
    });

    if (before.transform !== after.transform || before.opacity !== after.opacity) {
      animatedElements += 1;
      evidence.push(`Motion detected on ${sel}`);
    }
    if (animatedElements >= 3) break;
  }

  const entranceSequenced = animatedElements >= 2;

  const prefersReducedMotionHandled = await page.evaluate(() => {
    const html = document.documentElement.innerHTML.toLowerCase();
    return (
      html.includes("prefers-reduced-motion") ||
      html.includes("reduced-motion") ||
      html.includes("matchmedia")
    );
  });
  if (prefersReducedMotionHandled) evidence.push("Reduced-motion handling referenced in page");

  return {
    gsapPresent,
    animatedElements,
    entranceSequenced,
    prefersReducedMotionHandled,
    reducedMotionSimulated: false,
    evidence,
  };
}

export async function verifyReducedMotion(page: Page): Promise<boolean> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);

  const stillAnimating = await page.evaluate(async () => {
    const el = document.querySelector("h1, .display-404, svg, .jelly, [data-animate], .ring");
    if (!el) return false;
    const s1 = getComputedStyle(el);
    const t1 = s1.transform;
    const o1 = s1.opacity;
    await new Promise((r) => setTimeout(r, 500));
    const s2 = getComputedStyle(el);
    return s2.transform !== t1 || s2.opacity !== o1;
  });

  return !stillAnimating;
}

export async function verifyInteraction(page: Page): Promise<InteractionVerifyResult> {
  const evidence: string[] = [];

  const stats = await page.evaluate(() => {
    const buttons = document.querySelectorAll("button, a[href], [role='button']").length;
    const canvas = document.querySelectorAll("canvas").length;
    const inputs = document.querySelectorAll("input, textarea").length;
    const cursorCustom = [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some((r) => r.cssText.includes("cursor:") && !r.cssText.includes("auto"));
      } catch {
        return false;
      }
    });
    return { buttons, canvas, inputs, cursorCustom };
  });

  const interactiveControls = stats.buttons + stats.canvas + stats.inputs;
  if (stats.canvas > 0) evidence.push("Canvas element (game/interactive surface)");
  if (stats.buttons > 0) evidence.push(`${stats.buttons} button/link controls`);

  let hoverTargets = 0;
  const hoverCandidate = await page.$("button, a, [class*='cta'], [class*='btn']");
  if (hoverCandidate) {
    const before = await hoverCandidate.evaluate((el) => getComputedStyle(el).backgroundColor);
    await hoverCandidate.hover();
    await page.waitForTimeout(150);
    const after = await hoverCandidate.evaluate((el) => getComputedStyle(el).backgroundColor);
    if (before !== after) {
      hoverTargets += 1;
      evidence.push("Hover state change detected");
    }
  }

  if (stats.cursorCustom) evidence.push("Custom cursor CSS detected");

  let pointerAffectsVisual = false;
  const scrubSurface = await page.$('[role="slider"], [data-solid-scrub], .split-hero, .stage');
  if (scrubSurface) {
    const readScrub = () =>
      page.evaluate(() => ({
        clip: getComputedStyle(document.documentElement).getPropertyValue("--clip").trim(),
        split: getComputedStyle(document.documentElement).getPropertyValue("--split").trim(),
        aria: document.querySelector('[role="slider"]')?.getAttribute("aria-valuenow"),
      }));

    const before = await readScrub();
    const box = await scrubSurface.boundingBox();
    if (box) {
      const midY = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width * 0.2, midY);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.8, midY, { steps: 12 });
      const changed = await page
        .waitForFunction(
          (start) => {
            const clip = getComputedStyle(document.documentElement).getPropertyValue("--clip").trim();
            const split = getComputedStyle(document.documentElement).getPropertyValue("--split").trim();
            const aria = document.querySelector('[role="slider"]')?.getAttribute("aria-valuenow");
            return clip !== start.clip || split !== start.split || aria !== start.aria;
          },
          before,
          { timeout: 2000 },
        )
        .then(() => true)
        .catch(() => false);
      await page.mouse.up();
      if (changed) {
        pointerAffectsVisual = true;
        evidence.push("Scrub drag changes CSS variable or aria value");
      }
    }
  }

  if (!pointerAffectsVisual) {
    const listItem = await page.$("li, [class*='row'], a.cta, .actions a");
    const preview = await page.$("[class*='preview'], [class*='hover-card'], [data-preview]");
    if (listItem && preview) {
      await listItem.hover();
      await page.waitForTimeout(200);
      const visible = await preview.evaluate((el) => {
        const s = getComputedStyle(el);
        return parseFloat(s.opacity) > 0.1 && s.visibility !== "hidden" && s.display !== "none";
      });
      if (visible) {
        pointerAffectsVisual = true;
        evidence.push("Hover reveals preview panel");
      }
    }
  }

  if (!pointerAffectsVisual) {
    const stage = (await page.$("main, .stage, body"))!;
    if (stage) {
      const box = await stage.boundingBox();
      if (box) {
        const target = await page.$("svg, .jelly, [data-animate], .display-404");
        if (target) {
          const before = await target.evaluate((el) => getComputedStyle(el).transform);
          await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.35);
          await page.waitForTimeout(400);
          const after = await target.evaluate((el) => getComputedStyle(el).transform);
          if (before !== after) {
            pointerAffectsVisual = true;
            evidence.push("Pointer movement affects visual transform");
          }
        }
      }
    }
  }

  return {
    interactiveControls,
    hoverTargets,
    pointerCustomized: stats.cursorCustom,
    pointerAffectsVisual,
    evidence,
  };
}

/** Fail verify when img src 404s — broken hero photos should not ship. */
export async function verifyImagesLoaded(
  page: Page,
): Promise<{ ok: boolean; total: number; broken: number; evidence: string[] }> {
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

  const result = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img[src]")];
    const broken = imgs.filter((img) => img.naturalWidth === 0 || img.naturalHeight === 0);
    return {
      total: imgs.length,
      broken: broken.length,
      brokenSrcs: broken.map((img) => img.getAttribute("src") ?? "").slice(0, 3),
    };
  });

  const evidence: string[] = [];
  if (result.total === 0) {
    evidence.push("No img[src] elements — add a real photo hero if the design needs one");
  } else if (result.broken === 0) {
    evidence.push(`All ${result.total} images loaded (${result.total} img)`);
  } else {
    evidence.push(
      `${result.broken}/${result.total} images broken — fix src or bundle local assets`,
    );
    for (const src of result.brokenSrcs) {
      if (src) evidence.push(`Broken: ${src}`);
    }
  }

  return {
    ok: result.broken === 0,
    total: result.total,
    broken: result.broken,
    evidence,
  };
}

export type VerifyOptions = {
  url: string;
  timeoutMs?: number;
  requireGsap?: boolean;
  requireInteraction?: boolean;
  requireVisual?: boolean;
  minVisualScore?: number;
  verifyProfile?: import("./types").VerifyProfile;
  taste?: string;
  checkSlop?: boolean;
  pageType?: string;
  productDescription?: string;
};

export async function verifyUrl(opts: VerifyOptions): Promise<{
  motion: MotionVerifyResult;
  interaction: InteractionVerifyResult;
  visual: VisualVerifyResult;
  slop: import("./types").SlopVerifyResult;
  color: ColorVerifyResult;
  passed: boolean;
  agentNextSteps: string[];
  verifyProfile: import("./types").VerifyProfile;
  taste: string;
}> {
  const { resolveTaste } = await import("./tastes");
  const tasteProfile = resolveTaste(opts.taste);
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(opts.url, { waitUntil: "domcontentloaded", timeout: opts.timeoutMs ?? 30_000 });
    await page.waitForTimeout(900);

    const verifyProfile = opts.verifyProfile ?? tasteProfile.verifyProfile;
    const motion = await verifyMotion(page);
    const interaction = await verifyInteraction(page);
    const visual = await verifyVisual(page, verifyProfile);
    const color = await verifyColorMaterial(page);
    const slop =
      opts.checkSlop !== false
        ? await verifySlop(page, {
            pageType: opts.pageType,
            productDescription: opts.productDescription,
          })
        : { clean: true, flags: 0, evidence: ["Slop check skipped"] };
    const images = await verifyImagesLoaded(page);
    if (images.evidence.length) visual.evidence.push(...images.evidence);

    let reducedMotionSimulated = false;
    if (motion.prefersReducedMotionHandled) {
      reducedMotionSimulated = await verifyReducedMotion(page);
      if (reducedMotionSimulated) motion.evidence.push("Motion stops under prefers-reduced-motion simulation");
      else motion.evidence.push("Motion still running under reduced-motion — fix fallback");
    }
    motion.reducedMotionSimulated = reducedMotionSimulated;

    const isEditorial = verifyProfile === "editorial";
    const requireGsap = opts.requireGsap ?? tasteProfile.gsapRequired;
    const requireInteraction = opts.requireInteraction ?? true;
    const requireVisual = opts.requireVisual ?? true;
    const minVisualScore = opts.minVisualScore ?? (isEditorial ? 3 : 3);

    const motionOk = isEditorial
      ? motion.prefersReducedMotionHandled || !tasteProfile.motionRequired
      : (!requireGsap || motion.gsapPresent || motion.animatedElements >= 1) &&
        motion.prefersReducedMotionHandled &&
        motion.reducedMotionSimulated &&
        motion.animatedElements >= 1;

    const interactionOk =
      !requireInteraction ||
      ((interaction.interactiveControls >= 1 || interaction.hoverTargets >= 1) &&
        (interaction.pointerAffectsVisual || interaction.pointerCustomized || interaction.hoverTargets >= 1));

    const visualOk = !requireVisual || visual.score >= minVisualScore;

    const slopOk = slop.clean;
    const imagesOk = images.ok;

    const passed = motionOk && interactionOk && visualOk && slopOk && imagesOk;

    const agentNextSteps: string[] = [];
    if (!motion.gsapPresent && requireGsap) {
      agentNextSteps.push("Add GSAP bundle and entrance timeline (see brief motionSpec)");
    }
    if (!isEditorial && motion.animatedElements === 0) {
      agentNextSteps.push("No motion detected — run motion phase; animate transform/opacity");
    }
    if (!motion.prefersReducedMotionHandled && tasteProfile.motionRequired) {
      agentNextSteps.push("Add prefers-reduced-motion fallback with matchMedia");
    }
    if (!isEditorial && !motion.reducedMotionSimulated) {
      agentNextSteps.push("Reduced-motion fallback must stop ambient loops — test with emulateMedia");
    }
    if (!isEditorial && !visual.displayTypeScale) {
      agentNextSteps.push("Increase display type scale — refs use monumental type or generative 404 geometry");
    }
    if (!visual.customTypography && !isEditorial) {
      agentNextSteps.push("Use intentional display font pairing — not system-only stack");
    }
    if (isEditorial && !visual.customTypography) {
      agentNextSteps.push("Editorial taste: use SF Pro / -apple-system OR intentional accent pairing");
    }
    if (!visual.customAssets) {
      agentNextSteps.push(
        isEditorial
          ? "Add one visual anchor — project screenshot, bookshelf, or hover preview"
          : "Add asset pass — custom SVG paths, illustration, photo hero, or game canvas",
      );
    }
    if (!visual.editorialLayout) {
      agentNextSteps.push(
        isEditorial
          ? "Use narrow column + list sections — experience / artifacts / experiments"
          : verifyProfile === "hero"
            ? "Hero needs split layout or visual anchor beside copy — not centered headline-only template"
            : "Break centered hero template — use asymmetric editorial layout",
      );
    }
    if (!interactionOk) {
      agentNextSteps.push(
        isEditorial
          ? "Add one micro-interaction — hover preview, expand, or underline feedback"
          : "Add interaction: pointer must affect visuals, not just button hover",
      );
    }
    if (!slopOk) {
      for (const e of slop.evidence) {
        if (!e.startsWith("No common")) agentNextSteps.push(`Slop: ${e}`);
      }
      agentNextSteps.push("Rebuild art direction — study reference screenshots for type scale, layout courage, and copy tone");
    }
    if (!imagesOk) {
      for (const e of images.evidence) {
        if (e.startsWith("Broken:") || e.includes("broken")) agentNextSteps.push(`Images: ${e}`);
      }
      agentNextSteps.push("Bundle photos under your project public/ or assets/ — do not rely on dead CDN URLs");
    }
    if (color.score < 3) {
      for (const e of color.evidence) {
        if (e.startsWith("Define") || e.startsWith("Add") || e.startsWith("Low") || e.startsWith("Full-bleed")) {
          agentNextSteps.push(`Color: ${e}`);
        }
      }
    }
    if (passed) {
      agentNextSteps.push(`All gates passed (${tasteProfile.id} taste) — run premium-taste jury --taste ${tasteProfile.id}`);
    }

    return { motion, interaction, visual, slop, color, passed, agentNextSteps, verifyProfile, taste: tasteProfile.id };
  } finally {
    await page.close();
  }
}
