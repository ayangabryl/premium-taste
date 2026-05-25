# Premium Taste

**One prompt → senior UI for AI agents.** Brief, build phases, verify, jury.

---

## Install

```bash
npx skills add ayangabryl/premium-taste --skill premium-taste -g -y
```

Trigger in Cursor / Claude: **`/premium-taste`** or **“premium taste pricing card”**

---

## CLI (verify + jury)

Clone once, then use from any project:

```bash
git clone https://github.com/ayangabryl/premium-taste.git
cd premium-taste && bun install && bun link
npx playwright install chromium
```

Then in your app:

```bash
premium-taste design -p "pricing card with annual toggle"
premium-taste design -p "pricing card with annual toggle" --url http://127.0.0.1:3000/pricing --skip-brief
```

---

## Example prompts

```
pricing card with annual toggle
create a payment card
OurTravel bento card with trip preview inside the tile
404 for a podcast app
```

Always report **Verify · Jury · Human** scores.

---

## Development

```bash
bun install && bun test && bun run build
```

---

## License

MIT © Ian Gabriel D. Agujitas
