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

### The Claude chat view

A Claude tab opens as a **structured chat** (toggle to **Raw** for a full
xterm mirror when you need slash commands or plan-mode keystrokes). The chat
view mirrors the CLI in real time:

- **Live status** while the agent works — a spinner pill with the elapsed
  time and token count, plus a **Stop** button to interrupt the turn — and a
  streaming preview of the reply as it's typed, before it lands in the
  transcript.
- **Usage** in the header: context used, session cost, and the 5-hour / 7-day
  rate-limit windows.
- **Model & mode pickers** that reflect the agent's *actual* state (including
  auto/yolo) and relaunch it when changed.
- **Interactive prompts** — permission requests and numbered menus become
  real buttons (single-select, multi-select, or "type your own answer").
- **Rich messages** — pasted code and large blocks collapse to a chip you
  click to view; images preview inline.

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

On a service card, the **↗ button opens the app in the browser** — via its
[dev-proxy](../reference/config#dev-proxy-same-origin-urls-no-cors) URL
when the proxy is running, else the raw port. Clicking the card **body**
(the live output preview) attaches the terminal; the header never does,
so clicking a chip or port can't open a tab by accident.

## Board view

The **▦ toggle** in the topbar switches to a board of every workspace as
a card: agent state orb, services running, uncommitted count, worst PR
state, Jira chip — and one **↗ open button per running web service**.
Because every workspace is a real, isolated environment (own ports, own
databases), you can open several branches side by side and compare them
live. Cards needing attention (an agent awaiting input) float to the
top; click any card to dive into that workspace.

## Settings — read-first, three ways to edit

Settings is a **read-first** surface: each section (General, Environments,
Presets, Repos, Shared services, Ports) is a calm, typographic view of the
*effective* config — no dense input farms. Config-dense sections lay out as a
**horizontal board of fixed-width columns** (one per repo / environment /
preset / workspace) with edge fades that show when there's more to scroll;
values render with `{{var}}` templates highlighted, and zero-values stay hidden.

Every section offers **three ways to change the config**:

| Path | What it does |
| :-- | :-- |
| **Edit** | Opens the *exact* fragment that defines this section (a single `pom.d/**` file — resolved automatically, so it works with a [split config](/reference/config#splitting-into-multiple-files)) in a YAML editor. Saving **validates the whole merged config** before it lands, then reloads. |
| **Edit with Claude** | Opens the config assistant, seeded for that section — describe the change in plain language and it edits the right fragment over the [pom MCP](./workspace#agent-tools-mcp), validated. |
| **Raw YAML** | The full multi-file editor for hand-editing any fragment. |

Shared services keep their **runtime controls** (start / stop / restart / logs
per container, plus start-all / tear-down) alongside the read-only config.

::: tip Per-workspace config assistant
Right-click a workspace in the sidebar → **Fix config with Claude** to open a
dedicated Claude scoped to *that* workspace's worktree and branch — it fixes
that workspace's setup/env/config in isolation.
:::

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
stay consistent everywhere (including the code viewer and PR panels). Light
and dark follow **Apple system colors** (systemBlue accent, grouped
backgrounds, HIG label opacities, elevated surfaces); sepia is a warm
parchment for long sessions. Interactions use Apple-style easing — a gentle
spring for menus and modals, snappy press feedback, a focus ring for keyboard
users; if your OS is set to minimize motion, the dashboard honors it and
collapses animation.
