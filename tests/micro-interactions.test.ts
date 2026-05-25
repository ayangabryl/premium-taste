import { describe, expect, test } from "bun:test";
import { resolveMicroInteractions } from "../src/micro-interactions";

describe("proactive micro suggestions", () => {
  test("pricing suggests NumberFlow without user knowing the library", () => {
    const m = resolveMicroInteractions("pricing", "create me a pricing card");
    expect(m.proactiveSuggestions.some((s) => s.includes("NumberFlow"))).toBe(true);
    expect(m.proactiveSuggestions.some((s) => s.includes("textContent"))).toBe(true);
  });

  test("default context still suggests state feedback", () => {
    const m = resolveMicroInteractions("hero", "launch page");
    expect(m.proactiveSuggestions.length).toBeGreaterThan(2);
  });
});
