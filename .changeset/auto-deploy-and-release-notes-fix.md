---
"pod": patch
---

Two release-plumbing fixes:

- **Auto-deploy to the demo.** New `.github/workflows/deploy.yml` uses the official [`TryGhost/action-deploy-theme@v2`](https://github.com/TryGhost/action-deploy-theme) to upload + activate the theme on `pod.magicpages.co` whenever a stable release is published. Requires the `POD_GHOST_ADMIN_API_KEY` repository secret.
- **Release notes now populate the GitHub Release body.** `scripts/release.mjs`'s CHANGELOG extract regex now matches both `## [1.0.0]` (Keep-a-Changelog, hand-written) and `## 1.0.1` (Changesets output), so `## 1.0.1`'s section lands in the Release body instead of the "See CHANGELOG.md for details" fallback.
