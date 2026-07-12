---
"pod": patch
---

Ship a full, upload-as-is `routes.yaml` instead of the previous "merge these two entries into whatever's already there" partial file. On a fresh Ghost site, publishers can now click a single link on the GitHub Release page, download `routes.yaml`, and upload it via **Settings → Labs → Upload routes.yaml** — one file, no merging. The file is Ghost's default `routes.yaml` (root collection + tag/author taxonomies) plus Pod's two `/podcast/rss/` and `/subscribe/` entries. Publishers with existing route customisations merge instead of overwrite; the getting-started doc calls that out. `routes.yaml` also ships alongside `pod.zip` as a separate release asset via `scripts/release.mjs` so it can be grabbed without unpacking the theme.
