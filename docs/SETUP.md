# Setup

## Skill

```bash
npx skills add ayangabryl/premium-taste --skill premium-taste -g -y
```

## CLI (brief, verify, jury)

```bash
git clone https://github.com/ayangabryl/premium-taste.git
cd premium-taste && bun install && bun link
npx playwright install chromium
```

## Troubleshooting

| Issue | Fix |
|---|---|
| Skill not triggering | Re-run `npx skills add … -g -y` |
| `premium-taste: command not found` | Run `bun link` inside cloned repo |
| Playwright browser missing | `npx playwright install chromium` |
