<!-- VIBE-CURRENT-STATE:START -->
## Current repository facts (generated, authoritative only for the facts listed)

- Repository: `TheCuriousProcrastinator/Draftava-Obsidian`; local working branch: `feature/obsidian-community-submission`.
- Version data below is read from the **Git index** (the files staged for commit).
- Source `manifest.json`: version `0.0.16`.
- Source `package.json`: version `0.0.16`.
- GitHub publication: Published GitHub release `0.0.16` (reported by GitHub API). Other distribution channels are **unverified**.
- This section does **not** establish local build success, manual QA, App Store/Chrome Web Store approval, notarization, live website deployment, or release-asset integrity.
- The narrative below maintains architecture, decisions, issues and test evidence. Its older status and version claims are **historical** unless explicitly reconciled with this section.
- Before executable changes, inspect the actual checkout and validate the **exact files** on the real Mac. No automatic GitHub Actions.

<!-- VIBE-CURRENT-STATE:END -->

# Draftava Companion - Development Handoff

## Current verified state - November 23, 2026

- Repository: TheCuriousProcrastinator/Draftava-Obsidian.
- Repository visibility: public.
- Default branch: main.
- Latest GitHub release: 0.0.16.
- Source release commit: f9c81dc3dad78345f6a28d8c0f757ae072257dc1.
- Latest published assets: main.js, manifest.json and styles.css.
- Downloaded release assets matched the locally validated files.
- Plugin name: Draftava Companion.
- Plugin ID: inzrt-companion.
- Minimum Obsidian version: 1.12.0.
- Desktop-only, macOS.
- GitHub Actions were not started.

## Functionality

- Send selected text, Markdown notes and images to Draftava.
- Supports individual and multiple notes.
- Preserves clickable links to originating Obsidian notes.
- Detects a running Draftava application.
- Uses temporary capture files outside the vault.
- Links to the Draftava website.
- Requires the separate Draftava macOS application.

## Community directory

- Listing URL: https://community.obsidian.md/plugins/inzrt-companion
- Version 0.0.15 initially failed an automated manifest-description check.
- Version 0.0.16 corrected the blocking description error.
- The automated 0.0.16 review subsequently completed with no blocking errors.
- Remaining review findings were warnings and recommendations.
- Final public listing visibility must be checked independently.
- Do not equate a successful GitHub release with Community listing approval.

## Development

- Source: src/main.ts.
- Bundled executable: main.js.
- Manifest: manifest.json.
- Version compatibility: versions.json.
- Build: npm ci and npm run build.
- Validation: TypeScript check, node --check main.js and installed-plugin tests.
- Source links, capture and image transfer passed manual Mac testing.
- Original local checkout may have unrelated uncommitted changes; preserve them.
- Do not modify GitHub before validating executable changes on the actual Mac.
- Use the pre-commit handoff synchronization hook.
- GitHub Actions must remain workflow_dispatch-only.

## Related application

- Draftava repository: TheCuriousProcrastinator/Draftava.
- Latest application release: v1.4.10, build 473.
- Website: https://offensivecaffeine.com/draftava/

## Historical records

The complete pre-cleanup handoff remains available with:

git show b6ce3c3c4b592d2fe2391702aa254270c045b0b3:VIBECODING_HANDOFF.md

## Next session

Verify main, release assets, plugin directory status and local changes.
Preserve the plugin ID and existing capture behavior.
Require local build and manual validation for executable changes.
