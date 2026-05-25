import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export type IconHint = {
  id: string;
  label: string;
  use: string;
};

export type AssetLottieHint = {
  query: string;
  searchUrl: string;
  embedNote: string;
};

export type AssetImageHint = {
  provider: "unsplash" | "aura";
  tags: string[];
  searchUrl: string;
  license: string;
};

export type ProductionImage = {
  id: string;
  role: string;
  aspect: string;
  pageUrl: string;
  cdnUrl: string;
  alt: string;
  photographer: string;
  width: number;
  tags: string[];
  verified?: boolean;
};

export type AssetPlan = {
  pageType: string;
  productDescription: string;
  strategy: string;
  icons: IconHint[];
  lottie: AssetLottieHint[];
  images: AssetImageHint[];
  productionImages: ProductionImage[];
  instructions: string[];
};

type AssetSources = {
  providers: {
    svg: { custom: { note: string } };
    lottie: { library: string; embed: string; searchTemplate: string; note: string };
    image: {
      unsplash: { searchTemplate: string; license: string; note: string };
      aura: { searchTemplate: string; license: string; note: string };
    };
  };
  pageDefaults: Record<string, { prefer: string[]; avoid: string[]; metaphors: string[] }>;
  keywordMetaphors: {
    match: string[];
    icons: string[];
    lottieQueries: string[];
    imageTags: string[];
  }[];
};

type CopyVoice = {
  rules: string[];
  slopPatterns: string[];
  goodExamples: string[];
  badExamples: string[];
};

type ProductionCorpus = {
  version: string;
  license: string;
  cdnTemplate: string;
  categories: {
    id: string;
    match: string[];
    role: string;
    aspect: string;
    width: number;
    photos: {
      id: string;
      photoId: string;
      pageUrl: string;
      photographer: string;
      alt: string;
      tags: string[];
    }[];
  }[];
};

const ICON_LABELS: Record<string, string> = {
  key: "Key (reset / recover access)",
  "lock-closed": "Lock (sign in / secure gate)",
  envelope: "Envelope (email / inbox link)",
  "shield-check": "Shield (OTP / verification)",
};

const ICON_USE: Record<string, string> = {
  key: "Stroke-draw on valid email or unlock state. Customize path; do not drop raw icon unstyled.",
  "lock-closed": "Tie to credential state. Opens or brightens when fields validate.",
  envelope: "Animate on send success. Pair with status copy, not decoration.",
  "shield-check": "Fill or draw per digit on OTP. Must respond to input state.",
};

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf-8")) as T;
}

function matchKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

export function loadCopyVoice(): CopyVoice {
  return loadJson<CopyVoice>("corpus/copy-voice.json");
}

export function copyVoiceRules(): string[] {
  return loadCopyVoice().rules;
}

export function auditEmDashCopy(bodyText: string): { flagged: boolean; count: number; evidence: string[] } {
  const evidence: string[] = [];
  const count = (bodyText.match(/—/g) ?? []).length;
  if (count >= 2) {
    evidence.push(`Em-dash count ${count} in visible copy — AI brochure rhythm`);
  }
  if (/—[^—\n]{0,80}—/.test(bodyText)) {
    evidence.push("Em-dash clause chain detected in UI copy");
  }
  if (/\b(send|get|start|sign|continue|submit)[^.!?]*—/i.test(bodyText)) {
    evidence.push("CTA or action line uses em dash — reads generated");
  }
  return { flagged: evidence.length > 0 || count >= 1, count, evidence };
}

export function buildUnsplashCdnUrl(
  photoId: string,
  opts?: { width?: number; quality?: number; fit?: "crop" | "max" },
): string {
  const corpus = loadJson<ProductionCorpus>("corpus/production-images.json");
  const width = opts?.width ?? 2400;
  const quality = opts?.quality ?? 85;
  const fit = opts?.fit ?? "crop";
  return corpus.cdnTemplate
    .replace("{photoId}", photoId)
    .replace("{width}", String(width))
    .replace("{quality}", String(quality))
    .replace("{fit}", fit);
}

export function resolveProductionImages(opts: {
  productDescription?: string;
  pageType?: string;
  limit?: number;
}): ProductionImage[] {
  const corpus = loadJson<ProductionCorpus>("corpus/production-images.json");
  const text = `${opts.productDescription ?? ""} ${opts.pageType ?? ""}`.toLowerCase();
  const limit = opts.limit ?? 4;
  const picked: ProductionImage[] = [];
  const seen = new Set<string>();

  for (const cat of corpus.categories) {
    const hit = cat.match.some((m) => text.includes(m.toLowerCase()));
    if (!hit && opts.pageType === "hero" && cat.id.includes("hero")) continue;
    if (!hit) continue;

    for (const photo of cat.photos) {
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);
      picked.push({
        id: photo.id,
        role: cat.role,
        aspect: cat.aspect,
        pageUrl: photo.pageUrl,
        cdnUrl: buildUnsplashCdnUrl(photo.photoId, { width: cat.width }),
        alt: photo.alt,
        photographer: photo.photographer,
        width: cat.width,
        tags: photo.tags,
      });
      if (picked.length >= limit) return picked;
    }
  }

  if (picked.length === 0 && (opts.pageType === "hero" || opts.pageType === "landing")) {
    const fallback = corpus.categories.find((c) => c.id === "hero-abstract");
    for (const photo of fallback?.photos ?? []) {
      picked.push({
        id: photo.id,
        role: "atmosphere",
        aspect: "16:9",
        pageUrl: photo.pageUrl,
        cdnUrl: buildUnsplashCdnUrl(photo.photoId),
        alt: photo.alt,
        photographer: photo.photographer,
        width: 2400,
        tags: photo.tags,
      });
    }
  }

  return picked.slice(0, limit);
}

/** HEAD-check CDN URLs before agents embed them. */
export async function verifyProductionImages(images: ProductionImage[]): Promise<ProductionImage[]> {
  const out: ProductionImage[] = [];
  for (const img of images) {
    let verified = false;
    try {
      const res = await fetch(img.cdnUrl, { method: "HEAD", redirect: "follow" });
      verified = res.ok;
    } catch {
      verified = false;
    }
    out.push({ ...img, verified });
  }
  return out;
}

export function resolveAssetPlan(opts: {
  pageType: string;
  productDescription?: string;
}): AssetPlan {
  const sources = loadJson<AssetSources>("corpus/asset-sources.json");
  const pageType = opts.pageType;
  const product = opts.productDescription?.trim() ?? "";
  const pageDefaults = sources.pageDefaults[pageType] ?? sources.pageDefaults.auth;

  const iconIds = new Set<string>(pageDefaults?.metaphors.filter((m) => ICON_LABELS[m]) ?? []);
  const lottieQueries = new Set<string>();
  const imageTags = new Set<string>();

  for (const row of sources.keywordMetaphors) {
    if (matchKeywords(product, row.match) || matchKeywords(pageType, row.match)) {
      row.icons.forEach((id) => iconIds.add(id));
      row.lottieQueries.forEach((q) => lottieQueries.add(q));
      row.imageTags.forEach((t) => imageTags.add(t));
    }
  }

  if (iconIds.size === 0 && pageDefaults?.metaphors) {
    pageDefaults.metaphors.filter((m) => ICON_LABELS[m]).forEach((id) => iconIds.add(id));
  }

  const icons: IconHint[] = [...iconIds].slice(0, 3).map((id) => ({
    id,
    label: ICON_LABELS[id] ?? id,
    use: ICON_USE[id] ?? "Customize for product metaphor.",
  }));

  const lottie: AssetLottieHint[] = [...lottieQueries].slice(0, 3).map((query) => ({
    query,
    searchUrl: sources.providers.lottie.searchTemplate.replace("{query}", encodeURIComponent(query)),
    embedNote: sources.providers.lottie.note,
  }));

  const images: AssetImageHint[] = [...imageTags].slice(0, 2).map((tag) => ({
    provider: "unsplash" as const,
    tags: tag.split(" "),
    searchUrl: sources.providers.image.unsplash.searchTemplate.replace("{query}", encodeURIComponent(tag)),
    license: sources.providers.image.unsplash.license,
  }));

  if (pageDefaults?.prefer.includes("image") && images.length === 0 && ["hero", "portfolio"].includes(pageType)) {
    images.push({
      provider: "aura",
      tags: ["editorial", "texture"],
      searchUrl: sources.providers.image.aura.searchTemplate.replace("{query}", "editorial"),
      license: sources.providers.image.aura.license,
    });
  }

  const productionImages = resolveProductionImages({
    productDescription: product,
    pageType,
    limit: pageDefaults?.prefer.includes("image") ? 4 : 3,
  });

  const prefer = pageDefaults?.prefer.join(", ") ?? "svg";
  const strategy = product
    ? `Product-led assets for "${product.slice(0, 80)}" — prefer ${prefer}.`
    : `Page-type defaults for ${pageType} — prefer ${prefer}.`;

  const instructions = [
    sources.providers.svg.custom.note,
    icons.length
      ? `Icon metaphors below — draw custom inline SVG or canvas paths. Raw stock icon drop-in fails verify intent.`
      : `No icon metaphor match — invent inline SVG or canvas anchor for this product.`,
    productionImages.length
      ? `Production images resolved from corpus/production-images.json — use cdnUrl in hero. Verify with: premium-taste assets --verify`
      : `No curated production image match — search image links below or extend corpus/production-images.json.`,
    lottie.length
      ? `Search Lottie for state loops. Embed: ${sources.providers.lottie.embed}`
      : `Lottie optional — SVG stroke animation often fits auth/task screens better.`,
    pageDefaults?.avoid.length ? `Avoid: ${pageDefaults.avoid.join("; ")}.` : "",
  ].filter(Boolean);

  return {
    pageType,
    productDescription: product,
    strategy,
    icons,
    lottie,
    images,
    productionImages,
    instructions,
  };
}

/** Write asset plan and optional production images into the project assets folder. */
export async function materializeAssets(
  plan: AssetPlan,
  outDir = ".premium-taste/assets",
): Promise<string[]> {
  const absOut = resolve(outDir);
  mkdirSync(absOut, { recursive: true });
  const written: string[] = [];

  for (const img of plan.productionImages) {
    const ext = img.cdnUrl.includes(".png") ? "png" : "jpg";
    const dest = join(absOut, `${img.id}.${ext}`);
    try {
      const res = await fetch(img.cdnUrl);
      if (res.ok) {
        writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        written.push(dest);
      }
    } catch {
      /* skip failed download */
    }
  }

  writeFileSync(join(absOut, "plan.json"), JSON.stringify(plan, null, 2));
  if (plan.productionImages.length) {
    writeFileSync(join(absOut, "production-images.json"), JSON.stringify(plan.productionImages, null, 2));
  }
  return written;
}

export function formatAssetPlanMarkdown(plan: AssetPlan): string[] {
  const lines = [
    `**Strategy:** ${plan.strategy}`,
    "",
    ...plan.instructions.map((i) => `- ${i}`),
    "",
  ];

  if (plan.icons.length) {
    lines.push("### Icon metaphors (draw custom — no bundled drop-in)", "");
    for (const icon of plan.icons) {
      lines.push(`- **${icon.label}** (\`${icon.id}\`)`);
      lines.push(`  - ${icon.use}`);
    }
    lines.push("");
  }

  if (plan.lottie.length) {
    lines.push("### Lottie search", "");
    for (const l of plan.lottie) {
      lines.push(`- **${l.query}:** ${l.searchUrl}`);
      lines.push(`  - ${l.embedNote}`);
    }
    lines.push("");
  }

  if (plan.productionImages.length) {
    lines.push("### Production images (curated CDN)", "");
    for (const img of plan.productionImages) {
      lines.push(`- **${img.role}** · ${img.alt}`);
      lines.push(`  - CDN: \`${img.cdnUrl}\``);
      lines.push(`  - Source: ${img.pageUrl} (${img.photographer})`);
      if (img.verified !== undefined) lines.push(`  - Verified: ${img.verified ? "yes" : "no"}`);
    }
    lines.push("");
  }

  if (plan.images.length) {
    lines.push("### Premium images", "");
    for (const img of plan.images) {
      lines.push(`- **${img.provider}:** ${img.searchUrl} (${img.license})`);
    }
    lines.push("");
  }

  return lines;
}
