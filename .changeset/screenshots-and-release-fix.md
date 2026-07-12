---
"pod": patch
---

Docs + positioning polish for the first release:

- **README** — fresh demo screenshots (home hero, episode page, /subscribe/) from the live [pod.magicpages.co](https://pod.magicpages.co), plus a leading paragraph explaining the theme's actual differentiator: no separate podcast host needed — your Ghost site *is* the host.
- **AGENTS.md** — full contributor + agent guidance file at the repo root, adapted from the kalotyp pattern. Covers setup, tech stack, architecture, the Ghost integration contract, `pod:*` marker parsing, quality bar, release flow, Ghost trademark boundaries.
- **Release workflow** — set `createGithubReleases: false` on `changesets/action` so it stops trying to re-create the Release that `scripts/release.mjs` has already created (previously threw `422 tag_name already_exists` after a successful publish).
- **Accessibility** — verified WCAG 2.2 AA conformant via axe-core across 5 pages × 2 viewports × 2 color schemes (20 scans, 0 violations). Only automated-detection incompletes are the CSS-rendered cover-art tiles' contrast against gradient backgrounds, which axe can't measure but which manually clear 5.2:1 at the lightest stop.
