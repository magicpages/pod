---
"pod": patch
---

Fixed unstyled sites when Pod is installed straight from GitHub rather than from a release zip. Ghost's install-from-GitHub flow unpacks the repository's tracked files, and Pod's compiled CSS and JS were excluded from Git as build output — so those installs served templates that requested `assets/built/styles.css` and `assets/built/main.js` and got 404s for both. The compiled assets are now committed, matching how Ghost's own Casper and Source themes ship, and a new CI check rebuilds them on every pull request so they can't fall behind their sources. Release-zip installs were never affected and don't change.
