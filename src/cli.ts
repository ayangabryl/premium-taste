#!/usr/bin/env bun
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { briefToMarkdown, buildBrief } from "./brief";
import { findReferences, loadReferences, surpriseReference } from "./corpus";
import { formatJuryTerminal, juryMarkdownTemplate, runJury } from "./jury";
import { buildVerifyReport, formatVerifyTerminal, toJson } from "./report";
import { closeBrowser, verifyUrl } from "./verify";
import { formatAssetPlanMarkdown, materializeAssets, resolveAssetPlan, verifyProductionImages } from "./assets";
import { formatContextLine, resolveRunContext } from "./brief-context";
import { formatMicroCliBlock } from "./micro-interactions";
import { CLI_NAME, DEFAULT_BRIEF_DIR, PRODUCT_NAME, PRODUCT_VERSION } from "./constants";
import { cmdSkills } from "./skills";

function parseList(value?: string): string[] {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function cmdBrief(args: string[]): Promise<number> {
  let pageType = "404";
  let styles: string[] = [];
  let interactions: string[] = [];
  let refs: string[] = [];
  let out = `${DEFAULT_BRIEF_DIR}/brief.json`;
  let mdOut: string | undefined;
  let designMd: string | undefined;
  let surprise = false;
  let creative = false;
  let taste = "auto";
  let product = "";

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--type" || a === "-t") pageType = args[++i] || pageType;
    else if (a === "--taste" || a === "-T") taste = args[++i] || taste;
    else if (a === "--product" || a === "-p") product = args[++i] || product;
    else if (a === "--style") styles = parseList(args[++i]);
    else if (a === "--interaction") interactions = parseList(args[++i]);
    else if (a === "--refs") refs = parseList(args[++i]);
    else if (a === "--out" || a === "-o") out = args[++i] || out;
    else if (a === "--md") mdOut = args[++i] || out.replace(/\.json$/, ".md");
    else if (a === "--design" || a === "--design-md") designMd = args[++i];
    else if (a === "--surprise") surprise = true;
    else if (a === "--creative") creative = true;
  }

  let references = refs.length ? findReferences({ ids: refs, styles, interactions, limit: 3 }) : [];
  if (surprise && references.length === 0) references = [surpriseReference()];
  if (!creative && references.length === 0 && pageType !== "404") creative = true;

  const mode = creative || references.length === 0 ? "creative" : "reference";
  if (mode === "reference" && references.length === 0) {
    references = findReferences({ styles: ["Dark", "Animated"], limit: 2 });
  }

  const brief = buildBrief({ pageType, references, mode, taste, designMdPath: designMd, productDescription: product });
  const jsonPath = resolve(out);
  await mkdir(dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, JSON.stringify(brief, null, 2));

  if (mdOut) {
    const mdPath = resolve(mdOut);
    await mkdir(dirname(mdPath), { recursive: true });
    await writeFile(mdPath, briefToMarkdown(brief));
    console.log(`brief markdown: ${mdPath}`);
  }

  console.log(`brief json:     ${jsonPath}`);
  console.log(`mode:           ${brief.mode}`);
  console.log(`direction:      ${brief.directionReason ?? brief.taste}`);
  console.log(`page type:      ${brief.pageType}`);
  if (brief.references.length) {
    console.log(`references:     ${brief.references.map((r) => r.name).join(", ")}`);
  } else {
    console.log(`techniques:     ${brief.techniques.map((t) => t.name).join(", ")}`);
  }
  console.log(`phases:         ${brief.phases.length} (concept → layout → assets → motion → interaction → polish)`);
  if (brief.productEnriched) {
    console.log(`prompt:         expanded vague request → premium craft + color direction`);
  }
  if (brief.colorGuidance) {
    console.log(`color:          ${brief.colorGuidance.label}`);
  }
  if (brief.microInteractions?.proactiveSuggestions.length) {
    for (const line of formatMicroCliBlock(brief.microInteractions)) {
      console.log(line);
    }
  }
  if (brief.assetPlan?.icons.length) {
    console.log(`assets:         ${brief.assetPlan.icons.map((i) => i.id).join(", ")} → ${DEFAULT_BRIEF_DIR}/assets/`);
  }
  console.log(`copy voice:     no em-dash UI copy (verify flags slop)`);
  console.log("");
  console.log(brief.goal);
  return 0;
}

async function cmdRefs(args: string[]): Promise<number> {
  const list = loadReferences();
  if (args.includes("--json")) {
    console.log(JSON.stringify(list, null, 2));
    return 0;
  }
  for (const r of list) {
    console.log(`${r.id.padEnd(22)} ${r.name}`);
    if (r.screenshot) console.log(`  screenshot: ${r.screenshot}`);
    console.log(`  ${r.tags.style.join(", ")} | ${r.tags.interaction.join(", ")}`);
    console.log(`  ${r.concept.slice(0, 72)}…`);
    console.log("");
  }
  return 0;
}

async function cmdVerify(args: string[]): Promise<number> {
  let url = "";
  let out = `${DEFAULT_BRIEF_DIR}/verify.json`;
  let json = false;
  let requireGsap = true;
  let requireInteraction = true;
  let verifyProfile: import("./types").VerifyProfile | undefined;
  let pageType: string | undefined;
  let taste = "auto";
  let product: string | undefined;
  let briefPath: string | undefined;
  let noBrief = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--out") out = args[++i] || out;
    else if (a === "--json") json = true;
    else if (a === "--static-ok") requireGsap = false;
    else if (a === "--no-interaction") requireInteraction = false;
    else if (a === "--type" || a === "-t") pageType = args[++i] || "";
    else if (a === "--taste" || a === "-T") taste = args[++i] || taste;
    else if (a === "--product" || a === "-p") product = args[++i] || "";
    else if (a === "--profile") verifyProfile = args[++i] as import("./types").VerifyProfile;
    else if (a === "--brief") briefPath = args[++i] || briefPath;
    else if (a === "--no-brief") noBrief = true;
    else if (!a.startsWith("-")) url = a;
  }

  const ctx = resolveRunContext({
    briefPath,
    noBrief,
    pageType,
    taste,
    productDescription: product,
    verifyProfile,
  });

  if (!url) {
    console.error(
      `Usage: ${CLI_NAME} verify <url> [--brief ${DEFAULT_BRIEF_DIR}/brief.json] [--type auth] [--product \"OTP login\"]`,
    );
    return 1;
  }

  try {
    const result = await verifyUrl({
      url,
      requireGsap: taste !== "auto" ? ctx.tasteProfile.gsapRequired : requireGsap,
      requireInteraction,
      verifyProfile: ctx.verifyProfile,
      taste: ctx.tasteId,
      pageType: ctx.pageType,
      productDescription: ctx.productDescription,
    });
    const report = buildVerifyReport(url, ctx.briefPath, result);
    const outPath = resolve(out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, toJson(report));

    if (json) console.log(toJson(report));
    else {
      console.log(formatVerifyTerminal(report));
      console.log(formatContextLine(ctx));
    }

    return report.passed ? 0 : 1;
  } finally {
    await closeBrowser();
  }
}

async function cmdJury(args: string[]): Promise<number> {
  let url = "";
  let out = `${DEFAULT_BRIEF_DIR}/jury.json`;
  let mdOut: string | undefined;
  let json = false;
  let verifyProfile: import("./types").VerifyProfile | undefined;
  let pageType: string | undefined;
  let taste = "auto";
  let product: string | undefined;
  let briefPath: string | undefined;
  let noBrief = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--out") out = args[++i] || out;
    else if (a === "--md") mdOut = args[++i];
    else if (a === "--json") json = true;
    else if (a === "--type" || a === "-t") pageType = args[++i] || "";
    else if (a === "--taste" || a === "-T") taste = args[++i] || taste;
    else if (a === "--product" || a === "-p") product = args[++i] || "";
    else if (a === "--profile") verifyProfile = args[++i] as import("./types").VerifyProfile;
    else if (a === "--brief") briefPath = args[++i] || briefPath;
    else if (a === "--no-brief") noBrief = true;
    else if (!a.startsWith("-")) url = a;
  }

  if (!url) {
    console.error(
      `Usage: ${CLI_NAME} jury <url> [--brief ${DEFAULT_BRIEF_DIR}/brief.json] [--type auth] [--product \"OTP login\"]`,
    );
    return 1;
  }

  const ctx = resolveRunContext({
    briefPath,
    noBrief,
    pageType,
    taste,
    productDescription: product,
    verifyProfile,
  });

  const report = await runJury(url, {
    verifyProfile: ctx.verifyProfile,
    pageType: ctx.pageType,
    taste: ctx.tasteId,
    productDescription: ctx.productDescription,
    briefPath: ctx.briefPath,
  });
  const outPath = resolve(out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(report, null, 2));

  if (mdOut) {
    const mdPath = resolve(mdOut);
    await mkdir(dirname(mdPath), { recursive: true });
    await writeFile(mdPath, juryMarkdownTemplate(report));
    console.log(`jury markdown: ${mdPath}`);
  }

  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(formatJuryTerminal(report));
    console.log(formatContextLine(ctx));
  }

  const shipOk = report.total >= report.thresholds.ship;
  return shipOk ? 0 : 1;
}

function printHelp(): void {
  console.log(`${PRODUCT_NAME} — one-prompt senior UI for AI agents (v${PRODUCT_VERSION})

Quick start:
  skills install                    Install agent skill (Cursor, Claude, Codex…)
  design -p "your words"            Brief + discovery + playbook
  design -p "same" --url <url> --skip-brief   Verify + jury

Commands:
  skills    install | update | help
  design    ★ one prompt → brief (+ optional score with --url)
  brief     Product discovery + creative brief
  assets    Resolve SVG / Lottie / image sources
  tastes    Internal scoring profiles
  refs      Calibration references
  types     Page types (auth, portfolio, hero…)
  verify    Craft gates (reads ${DEFAULT_BRIEF_DIR}/brief.json)
  jury      Weighted score (reads ${DEFAULT_BRIEF_DIR}/brief.json)

Examples:
  npx ${CLI_NAME} skills install
  npx ${CLI_NAME} design -p "Framer-style pricing card with billing toggle"
  npx ${CLI_NAME} design -p "404 for a kids book publisher"
  npx ${CLI_NAME} design -p "OurTravel bento with preview in the card" --url http://127.0.0.1:3000/travel --skip-brief

Legacy alias: premiumref (same CLI)

User says one thing. You run design. Build. Always report Verify + Jury + Human scores.
`);
}

async function cmdTastes(): Promise<number> {
  const { loadTastes } = await import("./tastes");
  for (const t of loadTastes()) {
    console.log(`${t.id.padEnd(12)} ${t.label}`);
    console.log(`  ${t.tagline}`);
    console.log(`  verify: ${t.verifyProfile} · gsap: ${t.gsapRequired ? "yes" : "optional"}`);
    console.log("");
  }
  return 0;
}

async function cmdAssets(args: string[]): Promise<number> {
  let pageType = "auth";
  let product = "";
  let out = `${DEFAULT_BRIEF_DIR}/assets/plan.json`;
  let verify = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--type" || a === "-t") pageType = args[++i] || pageType;
    else if (a === "--product" || a === "-p") product = args[++i] || product;
    else if (a === "--out" || a === "-o") out = args[++i] || out;
    else if (a === "--verify") verify = true;
  }

  let plan = resolveAssetPlan({ pageType, productDescription: product });
  if (verify && plan.productionImages.length) {
    plan = { ...plan, productionImages: await verifyProductionImages(plan.productionImages) };
  }

  const written = await materializeAssets(plan, dirname(resolve(out)));
  await mkdir(dirname(resolve(out)), { recursive: true });
  await writeFile(resolve(out), JSON.stringify(plan, null, 2));

  console.log(formatAssetPlanMarkdown(plan).join("\n"));
  console.log("");
  console.log(`plan json:  ${resolve(out)}`);
  if (plan.productionImages.length) {
    console.log(`images:     ${dirname(resolve(out))}/production-images.json`);
  }
  if (written.length) console.log(`files:      ${written.join(", ")}`);
  return 0;
}

async function cmdDesign(args: string[]): Promise<number> {
  let prompt = "";
  let url: string | undefined;
  let skipBrief = false;
  let briefDir: string | undefined;
  let taste = "auto";
  let json = false;
  let refs: string[] = [];
  let designMd: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--product" || a === "-p") prompt = args[++i] || "";
    else if (a === "--url") url = args[++i] || "";
    else if (a === "--skip-brief") skipBrief = true;
    else if (a === "--brief-dir") briefDir = args[++i] || briefDir;
    else if (a === "--taste" || a === "-T") taste = args[++i] || taste;
    else if (a === "--refs") refs = parseList(args[++i]);
    else if (a === "--design" || a === "--design-md") designMd = args[++i];
    else if (a === "--json") json = true;
    else if (!a.startsWith("-") && !prompt) prompt = a;
  }

  if (!prompt.trim() && !skipBrief) {
    console.error(`Usage: ${CLI_NAME} design -p "your prompt in plain English" [--url http://127.0.0.1:8765/page]`);
    console.error("");
    console.error("Examples:");
    console.error(`  ${CLI_NAME} design -p "OurTravel bento card with trip preview inside"`);
    console.error(`  ${CLI_NAME} design -p "pricing card with annual toggle" --url http://127.0.0.1:8765/pricing --skip-brief`);
    return 1;
  }

  const { runDesign, formatDesignJson, formatDesignTerminal } = await import("./design");
  try {
    const result = await runDesign({
      prompt: prompt.trim(),
      url,
      skipBrief,
      briefDir,
      taste,
      refs,
      designMd,
    });

    if (json) console.log(formatDesignJson(result));
    else console.log(formatDesignTerminal(result));

    if (result.score) {
      return result.score.verifyPassed && result.score.juryTotal >= 75 ? 0 : 1;
    }
    return 0;
  } catch (err) {
    console.error(String(err));
    return 1;
  }
}

async function cmdTypes(): Promise<number> {
  const { loadPageTypes } = await import("./page-types");
  for (const t of loadPageTypes()) {
    console.log(`${t.id.padEnd(14)} ${t.label}`);
    console.log(`  verify: ${t.verifyProfile}${t.defaultTaste ? ` · default taste: ${t.defaultTaste}` : ""}`);
    console.log(`  ${t.goal.slice(0, 80)}…`);
    console.log("");
  }
  return 0;
}

async function main(): Promise<number> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "--help" || cmd === "-h") {
    printHelp();
    return 0;
  }
  if (cmd === "skills") return cmdSkills(rest);
  if (cmd === "design" || cmd === "go") return cmdDesign(rest);
  if (cmd === "brief") return cmdBrief(rest);
  if (cmd === "assets") return cmdAssets(rest);
  if (cmd === "refs") return cmdRefs(rest);
  if (cmd === "types") return cmdTypes();
  if (cmd === "tastes") return cmdTastes();
  if (cmd === "verify") return cmdVerify(rest);
  if (cmd === "jury") return cmdJury(rest);
  console.error(`Unknown command: ${cmd}`);
  printHelp();
  return 1;
}

main().then((code) => process.exit(code));
