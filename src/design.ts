import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { briefToMarkdown, buildBrief } from "./brief";
import type { CreativeBrief } from "./types";
import { inferPageTypeFromPrompt } from "./prompt-infer";
import { DEFAULT_BRIEF_DIR } from "./constants";

export type DesignRunOptions = {
  prompt: string;
  url?: string;
  skipBrief?: boolean;
  briefDir?: string;
  taste?: string;
  creative?: boolean;
  refs?: string[];
  designMd?: string;
};

export type DesignScore = {
  verifyPassed: boolean;
  juryTotal: number;
  juryVerdict: string;
  verifyPath: string;
  juryPath: string;
};

export type DesignRunResult = {
  prompt: string;
  inferredPageType: string;
  briefPath: string;
  briefMdPath: string;
  discoveryPath: string;
  brief: CreativeBrief | null;
  score?: DesignScore;
};

export async function writeDiscoveryStub(
  brief: CreativeBrief,
  discoveryPath: string,
): Promise<void> {
  if (existsSync(discoveryPath)) return;

  const lines = [
    `# Discovery — ${brief.pageType}`,
    "",
    "## User prompt",
    "",
    brief.productDescription ?? "",
    "",
    "## Answer before concept (from brief)",
    "",
    ...brief.discoveryQuestions.map((q) => `- [ ] **${q.id}:** ${q.prompt}`),
    "",
    "## Micro-interactions I will ship",
    "",
    ...((brief.microInteractions?.proactiveSuggestions ?? []).slice(0, 5).map((s) => `- [ ] ${s.replace(/\*\*/g, "")}`)),
    "",
    "## Concept (one sentence — agent writes after discovery)",
    "",
    "",
  ];

  await mkdir(dirname(discoveryPath), { recursive: true });
  await writeFile(discoveryPath, lines.join("\n"));
}

export async function runDesign(opts: DesignRunOptions): Promise<DesignRunResult> {
  const briefDir = resolve(opts.briefDir ?? DEFAULT_BRIEF_DIR);
  const briefPath = resolve(briefDir, "brief.json");
  const briefMdPath = resolve(briefDir, "brief.md");
  const discoveryPath = resolve(briefDir, "discovery.md");

  let brief: CreativeBrief | null = null;
  let inferredPageType = inferPageTypeFromPrompt(opts.prompt);

  if (!opts.skipBrief) {
    if (!opts.prompt.trim()) {
      throw new Error("design requires -p \"your prompt in plain English\"");
    }

    const { findReferences } = await import("./corpus");
    const references = opts.refs?.length ? findReferences({ ids: opts.refs, limit: 3 }) : [];
    const mode = references.length > 0 ? "reference" : "creative";

    brief = buildBrief({
      pageType: inferredPageType,
      references,
      mode,
      taste: opts.taste ?? "auto",
      designMdPath: opts.designMd,
      productDescription: opts.prompt.trim(),
    });
    inferredPageType = brief.pageType;

    await mkdir(briefDir, { recursive: true });
    await writeFile(briefPath, JSON.stringify(brief, null, 2));
    await writeFile(briefMdPath, briefToMarkdown(brief));
    await writeDiscoveryStub(brief, discoveryPath);
  }

  const result: DesignRunResult = {
    prompt: opts.prompt.trim(),
    inferredPageType,
    briefPath,
    briefMdPath,
    discoveryPath,
    brief,
  };

  if (opts.url) {
    const { resolveRunContext } = await import("./brief-context");
    const { verifyUrl, closeBrowser } = await import("./verify");
    const { buildVerifyReport, toJson } = await import("./report");
    const { runJury } = await import("./jury");

    const ctx = resolveRunContext({
      briefPath,
      pageType: inferredPageType,
      productDescription: opts.prompt.trim(),
      taste: opts.taste,
    });

    try {
      const verifyResult = await verifyUrl({
        url: opts.url,
        verifyProfile: ctx.verifyProfile,
        taste: ctx.tasteId,
        pageType: ctx.pageType,
        productDescription: ctx.productDescription,
      });
      const verifyReport = buildVerifyReport(opts.url, ctx.briefPath, verifyResult);
      const verifyPath = resolve(briefDir, "verify.json");
      await writeFile(verifyPath, toJson(verifyReport));

      const juryReport = await runJury(opts.url, {
        verifyProfile: ctx.verifyProfile,
        pageType: ctx.pageType,
        taste: ctx.tasteId,
        productDescription: ctx.productDescription,
        briefPath: ctx.briefPath,
      });
      const juryPath = resolve(briefDir, "jury.json");
      const juryMdPath = resolve(briefDir, "jury.md");
      await writeFile(juryPath, JSON.stringify(juryReport, null, 2));
      const { juryMarkdownTemplate } = await import("./jury");
      await writeFile(juryMdPath, juryMarkdownTemplate(juryReport));

      result.score = {
        verifyPassed: verifyReport.passed,
        juryTotal: juryReport.total,
        juryVerdict: juryReport.verdict,
        verifyPath,
        juryPath,
      };
    } finally {
      await closeBrowser();
    }
  }

  return result;
}

export function formatDesignTerminal(result: DesignRunResult): string {
  const lines: string[] = [
    "Premium Taste — one prompt",
    "",
    `prompt:      ${result.prompt}`,
    `page type:   ${result.inferredPageType} (auto)`,
    `brief:       ${result.briefMdPath}`,
    `discovery:   ${result.discoveryPath}`,
  ];

  if (result.brief) {
    lines.push("", "── read first (Senior micro) ──");
    for (const s of result.brief.microInteractions?.proactiveSuggestions.slice(0, 6) ?? []) {
      lines.push(`  → ${s.replace(/\*\*/g, "")}`);
    }

    lines.push("", "── build (6 phases — not one-shot) ──");
    for (const phase of result.brief.phases) {
      lines.push(`  ${phase.title}`);
    }

    lines.push("", "── typography ──");
    if (result.brief.typographyGuidance?.isSansFirst) {
      lines.push("  · Sans-first task UI — no editorial serif on form/checkout/pricing");
    }
    lines.push(`  · ${result.brief.typographyDirection.slice(0, 72)}${result.brief.typographyDirection.length > 72 ? "…" : ""}`);

    lines.push("", "── hard gates ──");
    lines.push("  · Bundle real images locally — verify fails on broken img src");
    lines.push("  · Semantic tokens + stable hovers (no translateY lift)");
    lines.push("  · NumberFlow on pricing toggles when brief says so");
    lines.push("  · Verify pass ≠ ship — jury ≥75, your eye still wins");
  }

  if (result.score) {
    lines.push(
      "",
      "── score ──",
      `  verify:  ${result.score.verifyPassed ? "pass" : "fail"}`,
      `  jury:    ${result.score.juryTotal}/100 (${result.score.juryVerdict})`,
      `  files:   ${result.score.verifyPath}`,
      `           ${result.score.juryPath}`,
      "",
      "── tell the user (mandatory) ──",
      "  End your reply with Verify + Jury + Human scores and the URL.",
    );
  } else {
    lines.push(
      "",
      "── when built, score with same prompt ──",
      `  bun run src/cli.ts design -p "<same words>" --url <url> --skip-brief`,
      "",
      "  Or: premium-taste verify <url> && premium-taste jury <url>",
      "",
      "── then always tell the user results ──",
      "  Verify pass/fail · Jury NN/100 · Human NN/100 · URL · one-line concept",
    );
  }

  lines.push("");
  return lines.join("\n");
}

export function formatDesignJson(result: DesignRunResult): string {
  return JSON.stringify(
    {
      prompt: result.prompt,
      inferredPageType: result.inferredPageType,
      briefPath: result.briefPath,
      briefMdPath: result.briefMdPath,
      discoveryPath: result.discoveryPath,
      micro: result.brief?.microInteractions?.proactiveSuggestions ?? [],
      phases: result.brief?.phases.map((p) => p.title) ?? [],
      score: result.score ?? null,
    },
    null,
    2,
  );
}
