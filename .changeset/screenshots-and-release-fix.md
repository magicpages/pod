---
"pod": patch
---

Fresh demo screenshots on the README (home hero, episode page, /subscribe/ landing) captured from the live [pod.magicpages.co](https://pod.magicpages.co) demo, plus a fix in the release workflow so the `changesets/action` post-publish hook doesn't try to re-create a GitHub Release that `scripts/release.mjs` has already created (previously threw `422 Validation Failed: tag_name already_exists` after a successful publish).
