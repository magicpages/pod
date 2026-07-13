---
"pod": patch
---

Subscribe surface cleanup:

- **New `subscribe_apple_url` custom setting.** When set, Pod's Apple Podcasts button uses the publisher's Apple show URL (`podcasts.apple.com/…`) instead of the iOS-only `podcast://` URL scheme — one working button for listeners on every OS + browser. When unset, the pill falls back to `podcast://` so day-one installs still get an Apple pill that works for iOS listeners.
- **Dropped `subscribe_iheart_url` + `subscribe_pandora_url`.** Both platforms are US-only and account for a small and shrinking share of podcast listeners; YouTube Music (which we keep) has overtaken Pandora in the US, and iHeart skews heavily toward its own owned-and-operated shows. Publishers who need those buttons can add them via a theme edit.
- Custom-setting count goes from 20 to 19 (freeing one slot for future use).
