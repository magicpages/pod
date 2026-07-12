#!/usr/bin/env node
// Release helper wired into the `changesets/action` publish step.
//
// changesets/action runs this once when a Version PR merges (i.e. when
// `main` has no accumulated changesets left). At that point package.json
// carries the new version and CHANGELOG.md has the freshly-written entry.
// Our job:
//
//   1. Build pod.zip.
//   2. Skip the whole flow if the vX.Y.Z tag is already on the remote —
//      idempotent for CI re-runs.
//   3. Tag the commit as vX.Y.Z (kept the `v` prefix rather than the
//      changesets default `pod@X.Y.Z` because Ghost theme repos idiomatic-
//      ally use it and it's what humans expect when browsing releases).
//   4. Push the tag.
//   5. Create the GitHub Release, using the matching CHANGELOG section as
//      release notes and pod.zip as the sole binary asset. Ghost's admin
//      "Upload theme" flow needs a raw zip download link — npm/CDN doesn't
//      apply.
//   6. Echo a `New tag:` line so `changesets/action` marks the run as
//      published in its output — a downstream CI job can key off that.
//
// Requires the `gh` CLI + a repo-scoped token in `GH_TOKEN` (the workflow
// wires `secrets.GITHUB_TOKEN` in).
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")
);
const version = pkg.version;
const tag = `v${version}`;

function sh(cmd, opts = {}) {
    return execSync(cmd, {
        cwd: REPO_ROOT,
        stdio: opts.capture ? "pipe" : "inherit",
        encoding: "utf8",
        ...opts,
    });
}

// (2) Skip if the tag already exists on the remote — CI re-runs on a
// released commit shouldn't try to re-tag or re-upload.
const remoteTags = sh("git ls-remote --tags origin", { capture: true });
if (
    remoteTags.includes(`refs/tags/${tag}\n`) ||
    remoteTags.includes(`refs/tags/${tag}^{}`)
) {
    console.log(`Tag ${tag} already exists on origin — skipping release.`);
    process.exit(0);
}

// (1) Build the zip (invokes `npm run build && node scripts/zip.mjs`).
sh("npm run zip");

// (5) Extract just this version's CHANGELOG section for the release notes.
// Match both Keep-a-Changelog-style `## [X.Y.Z]` (used in the initial
// hand-written entry) and Changesets-style `## X.Y.Z` (used by
// `changeset version` for every subsequent release). Section ends at the
// next `## ` heading regardless of format, so mixed histories work.
const changelog = fs.readFileSync(
    path.join(REPO_ROOT, "CHANGELOG.md"),
    "utf8"
);
const escaped = version.replace(/\./g, "\\.");
const section = changelog.match(
    new RegExp(
        `##\\s+\\[?${escaped}\\]?[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s+\\[?\\d|$)`
    )
);
const notes = section
    ? section[1].trim()
    : `Release ${tag}. See CHANGELOG.md for details.`;
const notesFile = path.join(REPO_ROOT, ".release-notes.md");
fs.writeFileSync(notesFile, notes);

// (3, 4) Tag + push. The workflow's checkout step already sets git user
// identity (via changesets/action) so we don't need to configure it here.
sh(`git tag -a ${tag} -m "Release ${tag}"`);
sh(`git push origin ${tag}`);

// (5) GitHub Release with pod.zip attached.
sh(
    `gh release create ${tag} pod.zip --title "Pod ${tag}" --notes-file "${notesFile}"`
);

fs.rmSync(notesFile, { force: true });

// (6) changesets/action watches for this line pattern to set its
// `published` + `publishedPackages` outputs.
console.log(`New tag: ${tag}`);
