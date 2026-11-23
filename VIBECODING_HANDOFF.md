<!-- VIBE-CURRENT-STATE:START -->
## Current repository facts (generated, authoritative only for the facts listed)

- Repository: `TheCuriousProcrastinator/Draftava-Obsidian`; local working branch: `feature/obsidian-community-submission`.
- Version data below is read from the **Git index** (the files staged for commit).
- Source `manifest.json`: version `0.0.16`.
- Source `package.json`: version `0.0.16`.
- GitHub publication: Published GitHub release `0.0.15` (reported by GitHub API). Other distribution channels are **unverified**.
- This section does **not** establish local build success, manual QA, App Store/Chrome Web Store approval, notarization, live website deployment, or release-asset integrity.
- The narrative below maintains architecture, decisions, issues and test evidence. Its older status and version claims are **historical** unless explicitly reconciled with this section.
- Before executable changes, inspect the actual checkout and validate the **exact files** on the real Mac. No automatic GitHub Actions.

<!-- VIBE-CURRENT-STATE:END -->

# Draftava Companion for Obsidian - Development Handoff

## Publish/release command - standing authorization (2026-10-13)

- When the user says "publish", "release", "make update", or equivalent, treat that statement as standing authorization to complete the full validated local release and publication workflow. Do not ask for additional publication consent or confirmation.
- Never create Terminal scripts that ask the user to type "PASS", "YES", or another validation or confirmation keyword before publishing. Never introduce case-sensitive validation gates. A user statement such as "pass", "passed", "works", or equivalent is an explicit confirmation of the corresponding manual tests, regardless of capitalization.
- If the exact source change has already passed required local build/tests and the user confirmed required manual verification, proceed immediately with committing the exact tested source, handoff update, release build/signing/packaging, GitHub releases, Sparkle appcast publication, and live verification. Do not ask the user to repeat validation.
- Keep the non-negotiable local validation gate: do not publish unvalidated executable/build-affecting changes. If required validation genuinely has not happened, stop and explain that blocker, with the minimum required local test instructions; do not pretend validation passed.
- Stop only for real blockers such as missing local validation, failed build/test, unsafe working tree, missing signing credentials, or a failed release step. Do not create arbitrary pauses, keyword prompts, or extra approvals. Do not run GitHub Actions automatically.
- If local Mac access is unavailable, supply one copy-pasteable, **noninteractive** Terminal block to carry out already-authorized release actions in the exact validated Mac checkout. Use existing credentials/keychain without inventing confirmation prompts. If genuine credentials or macOS prompts are unavoidable, report them as blockers, not additional publication-approval requests.
- This rule takes precedence over older handoff wording that might suggest an additional user confirmation after validation. It does not override mandatory validation or source-of-truth checks.


**Updated:** 2026-10-02

## Shared Vibe Coding workflow rules (2026-10-08)

### Documentation-only handoff exception
- When the user explicitly requests a documentation-only update, ChatGPT may edit the existing root `VIBECODING_HANDOFF.md` directly through GitHub without requiring a Mac build or a local checkout step.
- First inspect the actual repository, target branch, and existing handoff. Change only the handoff, preserve historical project context, and verify the resulting GitHub file and commit. Do not use this exception for application code, tests, scripts, configuration, workflows, version/build changes, release assets, or other build-affecting files.
- Before the next local development change, fetch the remote branch and reconcile the updated handoff with the local checkout. Never overwrite or silently reset unrelated local changes.
- The normal rule remains: validate the exact executable/build-affecting changes in the real Mac checkout before committing or pushing those changes. Include a current handoff with every meaningful validated development commit.

### Temporary worktrees, releases, and logs
- Create temporary Git worktrees under `/Users/alex/Desktop/tmp/<project>-...` using a project-specific name.
- Put release working folders, temporary release artifacts, staging directories, and build/release logs under `/Users/alex/Desktop/tmp/<project>-release-...`.
- Do not create disposable worktrees inside `/Users/alex/Documents/Vibe Coding`.
- Do not place release artifacts or logs directly on the Desktop root.
- After a successful verified release, remove temporary worktrees and temporary release artifacts when safe. Do not remove active worktrees, uncommitted work, published assets, or permanent project files.
- Retain failure logs only when useful for debugging; remove unnecessary temporary logs.
- These instructions govern future operations and take precedence over historical temporary-path examples elsewhere in this handoff.

### Low-overhead development defaults
- Use ChatGPT plus GitHub inspection and Mac-local Terminal scripts by default; do not use Codex, ChatGPT Work, separately billed API agents, or GitHub Actions runners unless explicitly requested.
- Prefer existing project scripts. Give one local command block to apply, build, test, and launch an executable change, then a separate commit/push block only after required validation is confirmed.
- Documentation-only updates under the exception above do not require a rebuild.

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


## Automatic handoff synchronization (2026-10-19)

- The tracked `.githooks/pre-commit` runs `Tools/vibe_handoff.py sync-staged` locally. It reads version/build from the Git index, reads the GitHub published release, refreshes only the bounded generated current-state section and stages the handoff in the same commit. It does **not** modify application code or establish build/manual-test validation.
- On a fresh Mac checkout, run `sh .githooks/install.sh` once. It refuses to replace an existing pre-commit hook. Do not bypass hooks with `--no-verify`. Changes to feature behavior, debugging decisions, known issues, manual validation, and next work still require a human-maintained narrative entry after the exact local test passes.
- Do not commit or push any executable change before successful validation in the real Mac checkout. The tool makes documentation updates only; GitHub Actions remain manual only.
- Sparkle applications' release scripts refresh generated release facts in source and update-feed handoffs once their respective release milestones are reached. Verify the live release/feed before claiming publication succeeded. Projects without a scripted release must refresh and commit the handoff after externally verifying publication.
- If GitHub release status cannot be verified, or the handoff contains unstaged edits, the hook blocks rather than guessing or overwriting your changes.

## Obsidian Community Plugin 0.0.15 - November 23, 2026

- Development branch: feature/obsidian-community-submission.
- Baseline: bcf34b5.
- Version 0.0.15, plugin ID remains inzrt-companion.
- Public display name: Draftava Companion.
- Added README, MIT LICENSE and versions.json.
- Added Draftava landing-page links to metadata, documentation, command palette and missing-app notice.
- Preserved the existing running-Draftava application detection improvement.
- Fixed selected Obsidian title capture.
- Local npm build, TypeScript and JavaScript checks passed.
- User confirmed manual validation PASS on the actual Mac.
- Installed main.js, manifest.json and styles.css verified against the tested local files.
- Original checkout's uncommitted changes remain untouched.
- Community directory submission and public release are pending.
- GitHub Actions remain manual-only.


## Draftava Companion 0.0.15 publication - November 23, 2026

- Branch: feature/obsidian-community-submission.
- Plugin ID remains inzrt-companion.
- Public name: Draftava Companion.
- Includes the Draftava landing-page links.
- Includes Obsidian source URLs for imported Ideas.
- Verified locally built main.js against the installed, manually tested plugin.
- User confirmed source-link behavior on the actual Mac.
- User confirmed Draftava 1.4.9 importer and Source editing behavior.
- Default branch must contain manifest version 0.0.15.
- GitHub release tag must be 0.0.15.
- Release assets: main.js, manifest.json, styles.css.
- Directory submission is a separate Obsidian account action.
- No automatic GitHub Actions.


Verified Draftava Companion 0.0.15 publication - November 23, 2026

- GitHub release 0.0.15 published.
- Repository is public.
- Release source commit: 4d3697cc229b9cbb5f53a40a12a2c0e5ab5a62f5.
- Published assets match the validated local files.
- Obsidian Community Plugins submission remains pending.
- GitHub Actions were not started.


## Draftava Companion 0.0.16 - November 23, 2026

- Corrected the Obsidian directory's blocking manifest-description error.
- Description no longer contains the prohibited word.
- Updated manifest, package metadata, lockfile and versions.json to 0.0.16.
- Plugin JavaScript and styles remain identical to validated 0.0.15.
- npm build, TypeScript and JavaScript checks passed on the user's Mac.
- Installed plugin files match the exact local release files.
- User confirmed manual capture, image and Source-link regression tests PASS.
- GitHub Actions remain manual-only.
- Obsidian directory review must be refreshed after publication.
