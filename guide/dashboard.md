# The dashboard

Running bare `pom` opens a browser dashboard — the primary way to drive
Pomelo day to day. It's a single-page app embedded in the binary (nothing
to install or serve separately) that talks to the same tmux sessions,
git worktrees, and services the CLI manages. This page is the conceptual
tour; see [Architecture](./architecture) for how it's built.

## Layout

- **Sidebar** — every workspace as a card: its Claude/agent state (the
  colored orb), how many services are running (`running/total`), how many
  repos have uncommitted changes, and a PR pill. Drag to reorder.
- **Main area** — the selected workspace's overview: services grouped by
  repo, each startable/stoppable in place, plus open terminals.
- **Tabs** — terminals, Claude sessions, code diffs, and PR views open as
  tabs across the top and persist as you move between workspaces.

## Tabs

Four kinds of tab, each backed by real state, not a snapshot:

| Tab | What it is |
| :-- | :-- |
| **Shell** | A live tmux pane mirrored with xterm.js — a real terminal in the browser. |
| **Claude** | A coding-agent pane, with its live state (idle / working / awaiting input) surfaced on the tab and sidebar. |
| **Code** | The branch's diff vs its base, as a file tree + side-by-side viewer. |
| **PRs** | Every open PR across the workspace's repos, with checks and mergeability. |

Terminal tabs stream continuously while visible. To keep memory flat with
many tabs open, only the active tab plus a small most-recently-used window
stay live; the rest suspend and resync from a fresh snapshot when you
return (tmux holds the real state). See
[flat-memory tab suspension](./architecture#what-keeps-the-dashboard-fast).

## Agent state & attention

Each workspace's coding agent reports a state — **idle**, **working**, or
**awaiting input** — pushed to the browser in real time (Server-Sent
Events, not polling). When an agent needs a reply, the topbar shows an
"agent needs you" pill; clicking an entry opens (or focuses) that
workspace's Claude tab so you can respond immediately. Optional toasts and
a notification center record these events.

To control the agent, right-click the **Claude Code** card in the overview
(or the **Claude** pill in the header) → **Restart** or **Stop**.

## Reviewing code

The **Code** tab lists files changed on the branch vs its base as a
collapsible directory tree (single-child folders compacted, VS Code
style), with a side-by-side diff. It's read-only — Pomelo is for
orientation and quick review, not full editing.

The **PRs** tab and the sidebar PR pill pull status straight from GitHub:
per-branch checks, review state, and **mergeability** (can it merge, and
if not, why — conflicts, behind base, blocked). Pomelo never merges for
you; it shows you where each PR stands and links out to GitHub for the
rest. Check rows link to their logs. Status is fetched by exact head
branch in batched GraphQL requests — complete and low-traffic (see
[Architecture](./architecture#what-keeps-the-dashboard-fast)).

Hovering the sidebar PR pill also shows, per branch, how many commits it
is **behind the default branch** (e.g. `↓12 behind`) — a quick cue that a
branch has drifted and may want a rebase before merging. This is computed
locally from the worktree, so it costs no GitHub API calls; the default
branch is refreshed in the background so the count stays current.

## Services & shared infra

The overview groups services by repo. Start or stop any service in place;
starting a repo service first ensures its shared services (Postgres,
Redis, …) are up. Ports are shown per service and are stable across
restarts. Keyboard: arrow keys move focus, Enter starts/stops, `r`
restarts, `o` opens in the browser, `/` opens quick-launch.

## Install as an app

The dashboard is a PWA: in Chrome/Edge/Arc/Dia use the address-bar
**Install** action (or menu → *Install app*), on Safari (macOS Sonoma+)
use **File → Add to Dock**, and on iOS **Share → Add to Home Screen**.
You get a standalone window with its own Dock icon and ⌘-Tab entry — no
address bar, no risk of closing it as a stray tab. It's still the same
local server underneath, so nothing else changes.

## Themes & motion

The dashboard ships **three themes** — dark, light, and sepia — switchable
in Settings. Every surface is driven by semantic CSS variables, so themes
stay consistent everywhere (including the code viewer and PR panels).
Interactions use a single Apple-style easing curve with subtle press and
state transitions; if your OS is set to minimize motion, the dashboard
honors it and collapses animation.
