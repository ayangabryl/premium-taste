import references from "../corpus/references.json";
import type { CreativeReference } from "./types";

export function loadReferences(): CreativeReference[] {
  return references.references as CreativeReference[];
}

export function findReferences(opts: {
  ids?: string[];
  styles?: string[];
  interactions?: string[];
  limit?: number;
}): CreativeReference[] {
  let list = loadReferences();

  if (opts.ids?.length) {
    const set = new Set(opts.ids.map((i) => i.toLowerCase()));
    list = list.filter((r) => set.has(r.id.toLowerCase()) || set.has(r.name.toLowerCase()));
  }

  if (opts.styles?.length) {
    const styles = new Set(opts.styles.map((s) => s.toLowerCase()));
    list = list.filter((r) => r.tags.style.some((t) => styles.has(t.toLowerCase())));
  }

  if (opts.interactions?.length) {
    const ints = new Set(opts.interactions.map((i) => i.toLowerCase()));
    list = list.filter((r) => r.tags.interaction.some((t) => ints.has(t.toLowerCase())));
  }

  return list.slice(0, opts.limit ?? 3);
}

export function surpriseReference(): CreativeReference {
  const list = loadReferences();
  return list[Math.floor(Math.random() * list.length)]!;
}
