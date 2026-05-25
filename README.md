# Premium Taste

**One prompt → senior UI for AI agents.** Brief, build phases, verify, jury.

---

## Quick start

```bash
npx premium-taste skills install
npx premium-taste design -p "pricing card with annual toggle"
```

Trigger in Cursor / Claude: **`/premium-taste`** or **“premium taste pricing card”**

First verify/jury run:

```bash
npx playwright install chromium
npx premium-taste design -p "pricing card with annual toggle" --url http://127.0.0.1:3000/pricing --skip-brief
```

---

## Commands

| Command | Purpose |
|---|---|
| `skills install` | Install agent skill |
| `design -p "…"` | Brief + discovery |
| `design -p "…" --url <url> --skip-brief` | Verify + jury |
| `verify <url>` | Craft checklist |
| `jury <url>` | Score /100 (ship ≥75) |

Always report **Verify · Jury · Human** scores.

---

## Example prompts

```
pricing card with annual toggle
create a payment card
OurTravel bento card with trip preview inside the tile
404 for a podcast app
redesign the login page — warmer, less template
```

---

## Development

```bash
bun install && bun test && bun run build
```

---

## License

MIT © Ian Gabriel D. Agujitas
