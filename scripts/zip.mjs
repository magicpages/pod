#!/usr/bin/env node
// Package the theme into a Ghost-ready `pod.zip` at the repo root.
//
// The Ghost admin's "Upload theme" flow expects an archive whose files sit
// inside a single top-level directory named after the theme (`pod/…`). The
// old `cd .. && zip -r ../pod.zip pod/…` shell one-liner worked only when
// the theme lived inside a `pod/` subdirectory of its parent — which is
// true in the theme-development monorepo but false in the standalone
// `magicpages/pod` release repo. This script stages the release into a
// scratch directory so it works from either layout.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const THEME_NAME = "pod";
const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const OUT_ZIP = path.join(REPO_ROOT, `${THEME_NAME}.zip`);

// Anything not listed here stays out of the release — no `node_modules`,
// no `.git`, no `.changeset`, no scratch screenshots.
const INCLUDES = [
    "assets/built",
    "assets/css",
    "assets/js",
    "assets/img",
    "partials",
    "podcast",
    "locales",
    "licenses",
    "package.json",
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "THIRD-PARTY-NOTICES.md",
    "routes.yaml.example",
    "screenshot-desktop.png",
    "screenshot-mobile.png",
];

// Every top-level .hbs file (default, index, post, page, tag, author,
// error variants, subscribe, …).
for (const f of fs.readdirSync(REPO_ROOT)) {
    if (f.endsWith(".hbs")) INCLUDES.push(f);
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "pod-zip-"));
const themeDir = path.join(stage, THEME_NAME);
fs.mkdirSync(themeDir, { recursive: true });

let copied = 0;
for (const rel of INCLUDES) {
    const src = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(src)) {
        console.warn(`  skip (missing): ${rel}`);
        continue;
    }
    const dest = path.join(themeDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    // `cp -a` preserves timestamps + follows nothing weird; portable enough
    // for CI (GNU coreutils) and macOS dev machines.
    execSync(`cp -a "${src}" "${path.dirname(dest)}/"`);
    copied += 1;
}

fs.rmSync(OUT_ZIP, { force: true });
execSync(
    `zip -r "${OUT_ZIP}" ${THEME_NAME} -x '*/\\.*' '*/.DS_Store'`,
    { cwd: stage, stdio: "inherit" }
);

fs.rmSync(stage, { recursive: true, force: true });

const bytes = fs.statSync(OUT_ZIP).size;
console.log(
    `\n✓ ${path.relative(REPO_ROOT, OUT_ZIP)}  (${copied} entries, ${(bytes / 1024).toFixed(0)} KB)`
);
