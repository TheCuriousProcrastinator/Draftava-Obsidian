# Draftava Companion for Obsidian - Development Handoff

**Updated:** 2026-10-02

## Project

Draftava Companion for Obsidian is a desktop-only Obsidian plugin that sends selected Obsidian content to Draftava.

Current plugin name:

`Draftava Companion for Obsidian`

Current plugin ID remains:

`inzrt-companion`

Do not rename the plugin ID without explicitly considering existing installed-plugin identity and update behavior.

## Repository

- GitHub: `TheCuriousProcrastinator/Draftava-Obsidian`
- Default branch: `main`
- Source baseline before this policy migration: `f46f0566b8816c18bb083e0ef76d627442146ed7`
- Current version: **0.0.14**
- Minimum Obsidian version: **1.12.0**
- Desktop-only: **yes**
- Latest verified GitHub Release: **0.0.14**
- Release asset: `Draftava-Obsidian-0.0.14.zip`

Always verify the current repository HEAD before changing source.

## Architecture

Relevant files:

- `src/main.ts`
- `main.js`
- `manifest.json`
- `styles.css`
- `esbuild.mjs`
- `package.json`
- `package-lock.json`
- `tsconfig.json`

Build command:

`npm run build`

The package uses TypeScript, esbuild, and the Obsidian API.

Current source supports sending Obsidian content to Draftava. Preserve existing behavior unless a product change is explicitly requested.

## GitHub Actions policy

Normal development and release validation is authoritative only when performed locally on the user's Mac.

The repository contains:

`.github/workflows/manual-validation.yml`

It is intentionally manual-only through `workflow_dispatch`.

GitHub Actions must not run automatically for:

- feature-branch pushes
- `main` pushes
- pull requests
- release/version tags
- schedules
- other repository events

GitHub Actions is optional clean-environment verification only and may be run only when the user explicitly requests it.

Development and releases do not depend on GitHub Actions.

## Development workflow

Before modifying the local checkout:

1. `git fetch origin`
2. verify the expected branch and HEAD
3. inspect `git status --short`
4. stop rather than overwrite, reset, stash, or merge unrelated local changes
5. make the smallest reliable change
6. validate locally
7. for executable or interaction changes, test the exact locally built plugin behavior
8. wait for explicit user validation when behavior requires manual verification
9. commit and push only the exact locally tested files
10. update this handoff with every meaningful development commit

GitHub remains read-only until the exact change passes required local validation.

## Release policy

Build and release verification happen locally on the Mac.

GitHub is used for:

- committed source/history
- branches and tags
- GitHub Releases
- downloadable release assets
- optional manually requested clean-environment verification

A release must not depend on hosted GitHub Actions.

GitHub does not back up local Obsidian configuration, secrets, ignored files, or uncommitted work.

## Policy migration scope

This migration changes only:

- `.github/workflows/manual-validation.yml`
- `VIBECODING_HANDOFF.md`

It does not change plugin source, generated `main.js`, manifest version, styles, package configuration, runtime behavior, or release assets.

## Next development task

Verify the current repository and this handoff before selecting the next product change.
