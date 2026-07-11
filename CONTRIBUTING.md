# Contributing to Pod

Thanks for wanting to help make Pod better. This document covers how to set
up the theme locally, the conventions we follow, and how to submit a change.

## Local development

Pod is a plain Ghost theme. Any Ghost 5.93+ install will do — local via
[ghost-cli](https://ghost.org/docs/install/local/), a container, or a
scratch site.

From this directory:

```bash
npm install                 # install build dependencies
npm run dev                 # Vite in watch mode — rebuild assets on change
npm run build               # one-off production build
npm run validate            # gscan against Ghost 6.x
npm run zip                 # package pod.zip for release
```

Point your local Ghost's theme directory at this repo (symlink into
`content/themes/pod`, or bind-mount into your container). Activate the theme
via **Ghost admin → Settings → Design → Change theme**.

Ghost re-reads `.hbs` files on every request, so template edits are live on
the next browser refresh — no rebuild needed. Asset changes
(`assets/css/*`, `assets/js/*`) require `npm run dev` or `npm run build` to
regenerate `assets/built/`.

## Where things live

```
pod/
├── assets/
│   ├── css/main.css        # Tailwind entry
│   ├── js/main.js          # Player + color-scheme + Pod meta hydration
│   ├── fonts/              # Self-hosted woff2 sources
│   └── built/              # Vite output (gitignored)
├── locales/
│   └── en.json + de/fr/es/uk/it.json
├── partials/               # Reusable Handlebars partials
│   ├── audio-player.hbs    # Pod audio player shell
│   ├── cover-art.hbs       # Cover tile + gradient fallback
│   ├── header.hbs / footer.hbs / navigation.hbs
│   ├── subscribe-band.hbs  # Home / archive band
│   ├── subscribe-pills.hbs # Top-5 pills + more-link (shared by band & CTA)
│   └── subscribe-grid.hbs  # Full 10–16 platform grid on /subscribe/
├── podcast/
│   └── rss.hbs             # iTunes-spec podcast feed served at /podcast/rss/
├── subscribe.hbs           # /subscribe/ landing page
├── default.hbs             # Base layout
├── index.hbs               # Home + tag + archive collections
├── post.hbs                # Single episode / post
├── page.hbs / tag.hbs / author.hbs / error*.hbs
├── routes.yaml.example     # /podcast/rss/ + /subscribe/ routing snippet
└── package.json            # Theme metadata + build scripts + Ghost custom settings
```

## Conventions

**Handlebars**
- Prefer partials over inline logic when a block is repeated in more than one
  template.
- Never reach into private Ghost helpers; stick to the documented set.
- Keep the same escape-conscious style for `{{content}}` and `{{html}}`; the
  RSS template uses a strict `<p>`-only whitelist for a reason and shouldn't
  be widened without a specific ask.

**CSS**
- Tailwind utility classes first; extract to `main.css` when you need a real
  component (`.pill`, `.chip`, `.pod-player`, …).
- Colors flow from CSS custom properties on `:root`. Never hard-code brand
  colors — read from `--color-*` so the site accent, dark scheme, and inverse
  surfaces all cascade correctly.
- The theme adapts to the publisher's Ghost admin choices (accent color,
  typography settings). Don't override those.

**JavaScript**
- Vanilla JS only. No framework, no bundle bloat.
- Prefer feature detection over user-agent sniffing.
- Every interactive element must be reachable and operable via the keyboard.

**Accessibility**
- All buttons / interactive elements need an `aria-label` when their visible
  text isn't self-describing.
- Focus outlines are set globally via the `.pod-shell :focus-visible` rule.
  Don't disable them.
- Preserve the `.skip-link` at the top of `default.hbs`.

**Internationalization**
- Any user-facing string that isn't publisher content should go through the
  `{{t "…"}}` helper.
- English is the canonical source. When you add a new string, also add it to
  every locale file with a translation you're confident in — or leave the
  translated value equal to the English string and flag it in your PR so a
  native speaker can complete it.

**Podcast RSS**
- Every change to `podcast/rss.hbs` must be validated by [Cast Feed
  Validator](https://castfeedvalidator.com/) or equivalent before being
  merged.
- The `<content:encoded>` whitelist is intentional. New Ghost card types
  need to be considered for whether they should degrade to prose in RSS.

## Submitting a change

1. Fork the repository and create a topic branch off `main`.
2. Do your work. Keep commits focused and well-described.
3. Run the validators locally:
   ```bash
   npm run build
   npm run validate     # gscan
   npm run zip          # sanity-check the release artifact
   ```
   `gscan` should report `✓ Your theme is compatible with Ghost 6.x` with
   zero warnings. If a warning surfaces, either fix it or explain in the PR
   why it's expected.
4. Add a changeset for any user-visible change:
   ```bash
   npm run changeset
   ```
   Pick `patch` for a bug fix, `minor` for a new feature or setting, `major`
   for anything that breaks existing installations (a template rename, a
   removed custom setting, a Ghost-version bump). Write the summary as if
   you're describing the change to a publisher who's about to update — the
   text lands verbatim in `CHANGELOG.md` on release. Not every change needs
   one: docs edits, CI-only tweaks, and internal refactors that don't
   affect published output can go in without.
5. Open a pull request. Include:
   - What the change does and why.
   - Any screenshots for visual changes (light and dark scheme both, if
     applicable).
   - Notes on backwards compatibility — Pod is used in production; breaking
     changes need a good story.

## How releases happen

You don't hand-edit `CHANGELOG.md` or bump `package.json` — the release
workflow does that for you. When your PR lands on `main`, the workflow
opens a **Version Packages** PR that bumps the version and rewrites the
changelog from the accumulated changesets. Merging that PR triggers the
release job: it runs `npm run zip`, tags the commit as `vX.Y.Z`, and
creates a GitHub Release with `pod.zip` attached — that's the file Ghost
admins download for **Settings → Design → Change theme → Upload**.

## Reporting a bug

Open an issue with:

- Ghost version and Pod version.
- Steps to reproduce.
- Expected vs. actual behaviour.
- If it's a visual bug, a screenshot in the affected color scheme.
- If it's an RSS bug, the URL of the affected feed (or a paste of the
  relevant `<item>` block) and the app / validator that flagged it.

## License

By contributing, you agree that your contributions will be licensed under
the [MIT License](./LICENSE).
