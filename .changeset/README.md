# Changesets

This folder is managed by [@changesets/cli](https://github.com/changesets/changesets).

When you make a user-visible change to the theme, run `npm run changeset` and follow the prompts. The CLI writes a markdown file here describing the change and the version bump it implies (`patch`, `minor`, or `major`).

When PRs with changesets land on `main`, the release workflow opens a **Version Packages** PR that bumps `package.json`, moves the accumulated changeset descriptions into `CHANGELOG.md`, and deletes the used-up changeset files. Merging that PR triggers the release: `pod.zip` is built and attached to a new GitHub Release for the tag `vX.Y.Z`.

Not every commit needs a changeset — docs edits, CI-only changes, refactors that don't affect published output, and formatting fixes can go in without one.
