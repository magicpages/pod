---
"pod": patch
---

Fix the auto-deploy trigger. The `on: release: published` trigger on `deploy.yml` didn't fire because GitHub's anti-loop rule silently drops that event when the release was created by `GITHUB_TOKEN` (which `scripts/release.mjs` does via `gh release create`). Switched to `on: workflow_run: workflows: [Release]`, which is officially blessed for this. The deploy job now guards on whether a `vX.Y.Z` tag matching `package.json`'s current version exists on origin — most Release runs are no-op replays and shouldn't trigger a redeploy. Also added `workflow_dispatch` for one-off manual kicks.
