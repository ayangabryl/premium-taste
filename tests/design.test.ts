import { describe, expect, test } from "bun:test";
import { inferPageTypeFromPrompt } from "../src/prompt-infer";
import { formatDesignTerminal, runDesign } from "../src/design";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("inferPageTypeFromPrompt", () => {
  test("pricing from vague prompt", () => {
    expect(inferPageTypeFromPrompt("create me a pricing card")).toBe("pricing");
  });

  test("landing from bento travel prompt", () => {
    expect(inferPageTypeFromPrompt("OurTravel bento card with trip preview inside")).toBe("landing");
  });

  test("404 from error page prompt", () => {
    expect(inferPageTypeFromPrompt("creative 404 page for a radio station")).toBe("404");
  });

  test("auth from login prompt", () => {
    expect(inferPageTypeFromPrompt("OTP login for bank app")).toBe("auth");
  });

  test("auth from payment card prompt", () => {
    expect(inferPageTypeFromPrompt("create a payment card")).toBe("auth");
  });

  test("pricing from typo prcing", () => {
    expect(inferPageTypeFromPrompt("creaste a prcing card")).toBe("pricing");
  });
});

describe("runDesign", () => {
  test("one prompt writes brief and discovery stub", async () => {
    const dir = join(tmpdir(), `premiumref-design-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    const result = await runDesign({
      prompt: "pricing card with annual monthly toggle",
      briefDir: dir,
    });

    expect(result.inferredPageType).toBe("pricing");
    expect(readFileSync(result.briefMdPath, "utf-8")).toContain("Senior micro");
    expect(readFileSync(result.discoveryPath, "utf-8")).toContain("Micro-interactions");
    expect(formatDesignTerminal(result)).toContain("one prompt");

    rmSync(dir, { recursive: true, force: true });
  });
});
