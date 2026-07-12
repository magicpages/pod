# AGENTS.md

Guidance for AI coding agents (and humans skimming for the rules) working in the
Pod repository. This is the canonical instruction file.

Pod is an open-source, MIT-licensed Ghost theme for podcasters, released by
[Magic Pages](https://www.magicpages.co). It turns any Ghost 5.93+ site into a
full podcast home: hero episode with a built-in audio player, iTunes-spec +
Podcasting 2.0 RSS feed at `/podcast/rss/`, a `/subscribe/` landing page that
deep-links to 16 podcast apps, and localised UI in six languages.

Live demo: [pod.magicpages.co](https://pod.magicpages.co).
Docs surface: the README, CONTRIBUTING, and CHANGELOG at the repo root.

This is a working, released codebase. The notes below describe what's actually
here.

## Setup & build

- **npm.** Install with `npm install`.
- `npm run dev` — Vite in watch mode; rebuilds `assets/built/` on change.
  Pair with a local Ghost bind-mounted at `content/themes/pod/` (bind-mount, not
  upload — see below).
- `npm run build` — one-off production build. Regenerates `assets/built/`.
- `npm run validate` — `gscan` against Ghost 6.x. Should report zero warnings.
- `npm run zip` — package a Ghost-ready `pod.zip` at the repo root (`scripts/zip.mjs`).
- `npm run changeset` — add a changeset for the current work.
- `npm run version` — bump `package.json` + regenerate `CHANGELOG.md` from
  accumulated changesets. Only ever run by CI on the Version PR branch.
- `npm run release` — build + tag + create the GitHub Release with `pod.zip`
  attached (`scripts/release.mjs`). Only ever run by CI when the Version PR
  merges.

## Tech stack

- **Handlebars** — Ghost's templating engine. No JSX, no framework runtime.
- **Tailwind CSS** — utility-first styling, `assets/css/main.css` is the entry.
  Real components extracted to CSS classes (`.pill`, `.chip`, `.pod-player`,
  `.cover-art`, …) where they repeat.
- **Vanilla JavaScript** — no framework. `assets/js/main.js` is the entry;
  `assets/js/player.js` is the audio player (~250 lines, no deps).
- **Vite** for the asset build (library mode isn't used; just the CSS +
  woff2 pipeline + JS bundling).
- **gscan** as the schema/API checker against a specific Ghost version.
- **Changesets** for versioning + CHANGELOG generation.
- **CSS custom properties** on `:root` for theme tokens — every colour flows
  from `--color-*`. Publisher's `@site.accent_color` sets the accent for the
  whole site. Never hard-code brand colours.

## Architecture

```
pod/
├── assets/
│   ├── css/main.css          # Tailwind entry + extracted components
│   ├── js/main.js            # Player, color-scheme toggle, pod:meta hydration
│   ├── js/player.js          # Audio player: skip ±30s, speed, waveform, keys
│   ├── fonts/                # Self-hosted woff2 sources
│   ├── img/default-cover.jpg # 3000×3000 RSS fallback (Ghost's stock cover
│   │                         # cropped square + re-compressed, ~360 KB)
│   └── built/                # Vite output (gitignored — regenerated on build)
├── locales/
│   └── en.json + de/fr/es/uk/it.json
├── partials/                 # Reusable Handlebars blocks
│   ├── audio-player.hbs
│   ├── cover-art.hbs         # Cover tile — <img> when feature_image, gradient
│   │                         # fallback + waveform + episode number otherwise
│   ├── header.hbs / footer.hbs / navigation.hbs
│   ├── post-card.hbs         # Archive list entry
│   ├── pod-duration.hbs      # Duration read from pod:duration marker
│   ├── subscribe-band.hbs    # Home + archive "listen on" band
│   ├── subscribe-pills.hbs   # Top-5 pills + more-link (shared surface)
│   └── subscribe-grid.hbs    # Full 10-16 platform grid on /subscribe/
├── podcast/
│   └── rss.hbs               # iTunes-spec + Podcasting 2.0 feed
├── subscribe.hbs             # /subscribe/ landing page
├── default.hbs               # Base layout, imports partials/header + footer
├── index.hbs                 # Home + tag + archive collections
├── post.hbs                  # Single episode
├── page.hbs / tag.hbs / author.hbs / error*.hbs
├── routes.yaml.example       # /podcast/rss/ + /subscribe/ routing snippet
├── screenshot-{desktop,mobile}.png  # Marketplace + README hero screenshots
├── docs/                     # README-only supplementary screenshots
├── scripts/
│   ├── zip.mjs               # Repo-root → pod.zip staging + package
│   └── release.mjs           # Tag + GitHub Release + pod.zip attach
├── .changeset/               # Changeset markdown files + config
└── .github/workflows/
    ├── ci.yml                # gscan + build + zip on push/PR
    ├── release.yml           # Version PR flow + release on merge
    └── deploy.yml            # release.published → deploy to pod.magicpages.co
```

## The Ghost integration contract

Pod is a **plain Ghost theme** — no admin patches, no server config changes.
Ghost 5.93+ loads it via **Settings → Design → Change theme → Upload theme**.

**Routes** — `routes.yaml.example` at the repo root ships the two entries Pod
needs: `/podcast/rss/` (renders `podcast/rss.hbs` with `content_type: text/xml`)
and `/subscribe/` (renders `subscribe.hbs`). Publishers merge these into their
existing routes file and upload it via **Settings → Labs → Upload routes**.
Missing routes → RSS feed returns 404 and the subscribe page falls back to a
404. Both routes are optional; the theme still works without them, just without
those two surfaces.

**Custom theme settings** live in `package.json` under `config.custom`. Ghost's
limit is 20 settings; Pod is at 20. Any new setting requires cutting an existing
one — no exceptions. Existing settings cover: color scheme default, iTunes
author/owner/category/explicit/type, PC2.0 GUID/locked/funding-url/value-type/
value-address, six subscribe-URL slots for closed catalogs (Spotify, Amazon,
YouTube Music, iHeart, Castbox, Pandora), and the two post-CTA controls.

**Per-episode metadata via `pod:*` markers** — Ghost's post-metadata surface
is thin, so per-episode data that doesn't fit a native field is passed via
HTML comments in the post's **Code injection → foot**. The RSS template + JS
player + cover-art hydrator all read from the same string. Markers:

```html
<!-- pod:audio=https://…/episode.mp3 -->        (optional; defaults to first <audio>)
<!-- pod:audioLength=21524816 -->               (file size in bytes for the RSS enclosure)
<!-- pod:duration=00:44:50 -->
<!-- pod:episode=12 -->
<!-- pod:season=1 -->
<!-- pod:explicit=false -->
<!-- pod:episodeType=full -->                   (full | trailer | bonus)
<!-- pod:chapter=00:03:42|Chapter title -->     (repeatable; PSC + PC2.0)
<!-- pod:chapters=https://…/chapters.json -->   (PC2.0 pointer)
<!-- pod:transcript=URL|MIME|LANG -->           (repeatable)
<!-- pod:person=Name|Role|Href|Img -->          (repeatable)
<!-- pod:socialinteract=URL|Protocol|AccountId -->
```

The RSS template's parsing pattern for each marker is: outer `split` at
`<!-- pod:KEY=`, inner `split` at ` -->`. `{{#if @last}}` picks single-value
markers, `{{#unless @first}}` iterates repeatable ones. Extend the pattern by
copying the existing block, not by writing new parsing.

## Feature scope

The theme's advertised surface, most of which is exercised on
[pod.magicpages.co](https://pod.magicpages.co):

- **Editorial home page** — hero episode with cover, audio player, custom
  excerpt; archive grid below with tag chips; optional newsletter signup with
  Portal-powered submission; optional Ghost recommendations block.
- **Episode page** — sticky-column layout on wide viewports (cover + host +
  player left, show notes right); client-rendered chapter list from
  `pod:chapter=` markers; end-of-episode CTA card; prev/next episode nav;
  comments when enabled.
- **`/subscribe/` landing page** — a 10-16 platform grid, dynamic per
  publisher config. Always shown for open-RSS apps (Apple, Overcast, Pocket
  Casts, Castro, Podcast Addict, AntennaPod, Podverse, Player FM, gPodder,
  RSS). Conditional for closed catalogs (Spotify, Amazon, YouTube Music,
  iHeart, Castbox, Pandora) — only rendered when the publisher supplies
  their show URL. URL patterns verified against Nathan Gathright's podcast
  platform catalog and each platform's own docs.
- **Homepage subscribe band** — top-5 pills sharing the same partial as the
  full grid, so they stay in lockstep.
- **iTunes-spec + Podcasting 2.0 RSS feed** — `<podcast:guid>`, `<podcast:
  medium>`, `<podcast:locked>`, `<podcast:funding>` (with Ghost tipjar
  fallback when `@site.donations_enabled`), `<podcast:value>`, per-episode
  `<podcast:transcript>`, `<podcast:chapters>`, `<podcast:person>`,
  `<podcast:socialInteract>`. Passes castfeedvalidator.com with a 93/100
  score out of the box; the remaining seven items are optional content
  that the demo doesn't populate.
- **Podcast-native cover art** — CSS-rendered gradient tile with waveform +
  episode number for episodes without a `feature_image`. Container-query
  scaling so the same partial reads well from 80px thumbs up to 460px hero.
  Shipped `assets/img/default-cover.jpg` as the RSS-side fallback for the
  same case, since podcatchers can't render CSS.
- **Light / dark / system** color-scheme with a header toggle; default set
  via the `color_scheme_default` custom setting. Publisher's Ghost accent
  drives the site accent — the theme reads from it, doesn't override.
- **Locales** — English, German, French, Spanish, Ukrainian, Italian. All
  UI strings route through the `{{t}}` helper.

## Code style & conventions

- **Handlebars** — prefer partials over inline repetition. Never reach into
  Ghost internals; stick to the documented helper set. Keep the
  escape-conscious pattern for `{{content}}` / `{{html}}` — the RSS template
  uses a strict `<p>`-only whitelist for a reason.
- **CSS** — Tailwind utility classes first, extract to `main.css` when the
  block is real component. Colours flow from `--color-*` custom properties.
  Never hard-code brand colours. Container queries (`cqi`) for anything that
  needs to scale across tile sizes.
- **JavaScript** — vanilla, no framework. Every interactive element must be
  reachable + operable via keyboard. Feature detection over user-agent
  sniffing.
- **Accessibility** — every non-descriptive interactive element needs an
  `aria-label`. Focus outlines are globally set; don't disable them. Keep
  the `.skip-link` at the top of `default.hbs`. Audio scrubber is a proper
  `role="slider"` with `aria-valuemin/now/max`.
- **Internationalization** — any user-facing string that isn't publisher
  content routes through `{{t "…"}}`. English is the canonical source. Add
  new strings to every locale file; leave translation equal to English if
  you're not confident, and flag it in the PR.

## Testing & quality bar

- **`npm run validate`** (gscan): must report `✓ Your theme is compatible
  with Ghost 6.x`, zero errors, zero warnings.
- **`npm run zip`** must produce a valid `pod.zip` at the repo root — the
  archive contents live under a `pod/` wrapper (Ghost admin requires it),
  no `.changeset` / `.github` / `node_modules` / `scripts` leaks.
- **RSS feed** — any change to `podcast/rss.hbs` must be validated by
  [Cast Feed Validator](https://castfeedvalidator.com/) and the [Podcast
  RSS Validator](https://www.podcast-rss-validator.com/) before merge. PSP-1
  certified + iTunes-spec required checks all green + Podcasting 2.0
  namespaces present.
- **Live browser check for UI work** — on `pod.magicpages.co` (the demo the
  theme is currently activated on), in both light and dark modes, at desktop
  and mobile viewports. Screenshots go in the PR when a visual change lands.
- **CI runs** `npm run validate`, `npm run build`, `npm run zip` on every PR
  + push to main. `pod.zip` is uploaded as a workflow artifact so reviewers
  can grab it without cloning + building locally.

### What "done" looks like

1. `npm run validate` clean.
2. `npm run build` produces asset output; `npm run zip` produces a valid
   `pod.zip`.
3. User-visible change → `npm run changeset` describes it. Not every change
   needs one: docs edits, CI-only tweaks, and internal refactors that don't
   affect published output can go in without.
4. RSS-touching changes validated against the two validators above.
5. Visual changes verified in both color schemes + at both breakpoints.

## Commit & PR conventions

- Commits are prose, not conventional-commits — the changesets flow doesn't
  parse commit messages. Write like a human describing the change.
- One logical change per commit. Reviewers should be able to read the diff.
- **No AI attribution** in commit messages. No `Co-Authored-By: Claude …`,
  no `Generated with …` footers. Ever.
- Every user-visible PR includes a changeset (see above).

## How releases happen

Contributors don't hand-edit `CHANGELOG.md` or bump `package.json`. The
release workflow does it:

1. PR lands on `main` with a `.changeset/*.md`.
2. `changesets/action@v1` opens a **Version Packages** PR that bumps
   `package.json` + rewrites `CHANGELOG.md` from the accumulated changesets.
3. Merging that PR triggers `scripts/release.mjs`: builds `pod.zip`, tags
   `vX.Y.Z`, creates the GitHub Release with `pod.zip` attached.
4. Ghost admins download `pod.zip` from the Releases page for **Settings →
   Design → Change theme → Upload**.

Not every push cuts a release — only merges that arrive with no accumulated
changesets left (which happens exactly when the Version PR merges) trigger
the publish step.

`scripts/release.mjs` is idempotent: if the `vX.Y.Z` tag is already on
`origin`, it exits 0 without re-tagging or re-uploading. Safe to re-run.

**Auto-deploy to the demo.** `.github/workflows/deploy.yml` fires on
`release: published` — it checks out the release tag, builds
`assets/built/`, and hands off to `TryGhost/action-deploy-theme@v2` which
uploads + activates the theme on `pod.magicpages.co` via the Ghost Admin
API. Requires the `POD_GHOST_ADMIN_API_KEY` repository secret (staff /
admin API key in `<id>:<hex_secret>` form). Pre-releases are skipped by
`if: github.event.release.prerelease == false`. Other publishers who
install Pod download `pod.zip` from the Releases page manually.

## How to work in this codebase

- **Always start by reading.** Before changing a template, read it, its
  partials, and the CSS classes it touches. Don't pattern-match from the
  filename.
- **Publisher choices are load-bearing.** The theme reads from
  `@site.accent_color`, `@site.icon`, `@site.cover_image`, `@site.
  donations_enabled`, `@site.recommendations_enabled`, `@site.
  comments_enabled`, `@site.locale`. If the publisher has set them, honour
  them. Don't override for benchmark gains, don't hide UI to boost Lighthouse.
- **Hands off `{{ghost_head}}` / `{{ghost_foot}}`.** Ghost-injected scripts
  (Portal, Sodo, comments, analytics) are the platform's territory. The
  theme wraps them, doesn't strip or replace them.
- **Don't upload the theme zip during local dev.** Ghost bind-mounted at
  `content/themes/pod/` reads source directly. Upload cycles wipe
  `assets/built/`, breaking Lighthouse a11y + perf with 404 CSS. Use the
  upload flow only when testing a release build against a real Ghost.
- **Don't over-engineer performance for benchmark vanity.** 95-99 Lighthouse
  perf with 100 elsewhere is done. Hand-extracted critical CSS for 1-2
  points is a bad trade.
- Lead with the recommendation, then the reasoning. For hard-to-reverse
  decisions (breaking a custom setting, changing a routes-yaml default,
  removing a locale), stop and discuss first, then leave a load-bearing
  inline comment at the call site explaining *why*.

## Legal & attribution

- **License** — MIT. All new code is MIT. Contributor commits are implicitly
  MIT-licensed under the CONTRIBUTING flow.
- **Fonts** — Inter, Source Serif Pro, JetBrains Mono. All under
  [SIL OFL 1.1](./licenses/OFL-1.1.txt). Per-font attribution in
  [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
- **Ghost trademark** — Ghost® is a registered trademark of the Ghost
  Foundation. Pod is **not affiliated with or endorsed by** the Ghost
  Foundation. The theme calls itself "a Ghost theme," which is a
  descriptive use — describing what the theme is *for*, not a claim of
  affiliation. Never rename it to imply endorsement (no "Ghost Pod",
  "GhostPod", "Ghost Podcast Theme"). The trailing-descriptor phrasing
  ("… for Ghost", "… on Ghost") is the safe form.

## Project context

Pod is part of the [Magic Pages](https://www.magicpages.co) stack — a
managed Ghost hosting service that values open infrastructure, EU data
sovereignty, and direct customer relationships. Pod exists to give the
Ghost ecosystem a solid open-source podcast theme, so publishers who want
to run their show on their own domain don't have to wrestle with
technology or with themes not built for audio.

When in doubt, pick the option that makes Pod a better gift to the Ghost
community. Optimise for adoption, contribution, and longevity.

---

License: MIT · Repository: github.com/magicpages/pod ·
Maintainer: Jannis Fedoruk-Betschki <jannis@magicpages.co>
