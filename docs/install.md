# Install

Pomelo is a **native macOS app**. Download the DMG, drag it to Applications,
open it. That's the whole install — no account, no CLI, no setup wizard.

::: info Requirements
macOS 14 (Sonoma) or later · Apple Silicon or Intel · signed with an Apple
Developer ID and notarized, so it opens without Gatekeeper warnings.
:::

## Download

1. Open the [latest release](https://github.com/toantran292/pomelo-releases/releases/latest).
2. Download **`Pomelo-<version>.dmg`**.
3. Open it and drag **Pomelo** into **Applications**.
4. Launch Pomelo (Applications or Spotlight).

## First run

1. **Pick your workspace folder** — the parent directory Pomelo creates
   per-branch worktrees under.
2. **New session** — add your repos (a local folder or a git URL); Pomelo
   scaffolds the project.
3. **Let it wire the config** — an onboarding agent reads each repo, writes a
   runnable `pom.yml`, and loops the [config doctor](./concepts) until it's
   clean.

Full walkthrough: [Quick Start](./quickstart).

## Tools it drives

Pomelo shells out to a few standard dev tools. Install the ones your projects
use — Pomelo detects each and only asks when a repo actually needs it.

| Tool | Needed for | Install |
| :--- | :--- | :--- |
| **git** | Per-branch worktrees (always) | `xcode-select --install` |
| **gh** | PR status, checks, mergeability | `brew install gh` → `gh auth login` |
| **claude** | Built-in Claude agent + onboarding | `npm i -g @anthropic-ai/claude-code` |
| **docker** | Shared services (Postgres/Redis/MinIO/OpenSearch) | `brew install --cask docker` |

## Existing config carries over

Already have a `pom.yml`, even a heavily customized
one? Open Pomelo, point it at that project folder, and it loads your config
**as-is** — nothing to migrate or rewrite. Your workspaces and repos show up as
before, now in the native UI.

## Update

**Settings › General › Updates** tells you when a new release is out. Download
the new DMG, drag it over the old app, relaunch.
