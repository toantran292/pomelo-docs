# FAQ & troubleshooting

Answers to the questions that come up most — especially the non-obvious
ones. If something here is out of date, please open an issue.

## macOS won't open the app ("unidentified developer" / Gatekeeper)

It shouldn't — the app is signed with an Apple Developer ID and notarized,
so Gatekeeper opens it silently. If a stray copy is quarantined (e.g.
downloaded oddly), right-click **Pomelo.app** → **Open** once, or verify
from Terminal:

```bash
spctl -a -vv /Applications/Pomelo.app
# → accepted, source=Notarized Developer ID
```

## The onboarding agent didn't write a config

The onboarding agent uses the `claude` CLI. Install it with
`npm install -g @anthropic-ai/claude-code`, then create the session again.
You can always write `pom.yml` by hand — see the
[config reference](../reference/config).

## The config doctor says something's missing

The doctor (at the bottom of the **Project** config editor) reports exactly
what's blocking the project from running — a tool not installed, docker not
running, a database not created, a template that doesn't resolve. Fix the
named item and the strip clears. The doctor is deterministic (no LLM), so
its verdict is the source of truth for "is this runnable".

## Shared services (Postgres/Redis/…) aren't running

They need **docker**. You don't have to start them manually — starting a
repo service first brings its shared dependencies up. Check `docker ps`,
and that Docker Desktop is running.

## A service starts fine in my terminal but fails in Pomelo

Services run via `zsh -ic` (an **interactive** shell) so your `~/.zshrc`
is sourced and version managers (nvm, rvm, asdf) resolve the right
toolchain. If a service still can't find a binary, make sure the tool is
set up in your `.zshrc` (not only `.zprofile`/`.bash_profile`), or put the
setup in the service's `pre_start` hook. `pre_start` runs after the `cd`
into the worktree and before the command.

## PR badges / checks don't show up

- Add a GitHub token in **Settings ▸ Integrations ▸ Forge · GitHub** and hit
  **Test**. Pomelo talks to GitHub directly (no `gh` CLI) — a read-only token
  is enough (classic `repo`, a fine-grained PAT with Pull requests/Contents/
  Metadata read, or `export GH_TOKEN=$(gh auth token)`). See
  [Connecting GitHub](/docs/app#connecting-github).
- On an **organization**, a fine-grained token must be approved by an org
  admin before it works.
- The repo needs a GitHub `origin` remote. **SSH host aliases work**
  (e.g. `git@myalias:owner/repo` from your `~/.ssh/config`) — Pomelo reads
  `owner/repo` from any URL form.
- A workspace shows **no PR pill** when its branch simply has no open PR.

## Where is "Delete workspace"?

Right-click a workspace in the sidebar → **Delete workspace…**. It's
offered on branch workspaces only — **main** is the pinned project home and
can't be deleted (it has **Pull latest** instead). Right-click also has
**Add repos…** and **Reset databases…**.

## How do I add a repo to the project?

Right-click the **main** workspace → **Add repo (clone from URL)…**, paste
a git URL (SSH or HTTPS; aliases work). Pomelo clones it, registers it in
`pom.yml`, and reloads. On a **branch** workspace, right-click → **Add
repos…** adds worktrees for repos already declared in the project.

## How do I delete a session?

Open the session switcher (top-left project chip) and **right-click a
session** → **Remove from list** (unregister, keep the files) or **Delete
session + files…** (also removes its directory from disk). You can't delete
the **active** session — switch to another first.

## Two services grabbed the same port / ports keep changing

Each `port: true` service gets a random free port reserved atomically, and
keeps it while it runs. On restart it may get a fresh port — harmless,
because the dev-proxy re-resolves it and shared services keep sticky ports
for stable connection strings. If a start reports a port in use, something
outside Pomelo is holding it; free it and start again.

## I deleted a workspace folder by hand and now create fails

Deleting a `workspace--…` folder with `rm -rf` instead of the **Delete
workspace** action leaves git with a stale worktree registration. Pomelo
prunes stale registrations automatically before adding a worktree, so a
retry usually just works. Prefer the **Delete workspace** action — it
removes worktrees, databases, and ports together, so nothing goes stale.

## When are `.env` files (re)written?

On three events, and only then: **workspace create**, **service start**
(picks up config edits before launch), and an **env-profile switch**. So
edit config, then start — the env reflects it.

## How do I update the app?

Pomelo tells you in **Settings › General › Updates** when a new release is
available. Download the new DMG, drag **Pomelo** over the old app in
Applications, and relaunch. See [Install › Update](./install#update).
