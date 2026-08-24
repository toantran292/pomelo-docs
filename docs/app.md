# The app

Pomelo is a **native macOS app** — the primary way to drive Pomelo day to
day. It links the Go core directly (in-process, no port, no browser), so
everything you see is the real state of your worktrees, services, and
agents. This page is the conceptual tour.

<Shot text="The full app window — sidebar, service board, tabs" />

## Layout

The window is three columns plus a top bar:

- **Sidebar** — every workspace as a row: its branch, how many services
  are running, uncommitted-change count, a PR pill, and the Claude/agent
  state. Switch sessions from the project chip at the top-left.
- **Service board** — the selected workspace's services, laid out as
  **columns per repo** with a **card per service**. Each card has
  start/stop, a live output preview, its port, and a bolt **⚡ menu** of
  that repo's shortcuts.
- **Tabs** — terminals, the Claude session, and other views open across
  the main area and persist as you move between workspaces.

## Top bar

The top bar carries the app-wide surfaces:

| Button | What it opens |
| :-- | :-- |
| **Shared services** | Start / stop / restart the Postgres/Redis/… containers, plus start-all / tear-down. |
| **Activity monitor** | Live CPU / RAM of Pomelo's service holders. |
| **Project** | The `pom.yml` **config editor** + an **ENV inspector** (the resolved env for each repo/workspace). The config editor has the [config doctor](./concepts#config-doctor) health strip at its bottom. |
| **Theme** | Switch dark / light / sepia. |
| **Settings** (⌘,) | App settings, including **Diagnostics** — the app log and dev-proxy routing. |

::: tip Where the doctor and logs live
The config doctor is **not** a separate top-bar button — it sits under the
config editor (Project). Logs live in **Settings › Diagnostics**.
:::

## Service board

The board groups services by repo, one column each. On a service card:

- **Start / stop** the service in place. Starting a repo service first
  brings up its shared services (Postgres, Redis, …) automatically.
- **Live preview** — the card body shows the service's recent output;
  click it to attach a full terminal tab.
- **Port** — shown per service, resolved on demand; you rarely need it
  directly since the [dev-proxy](../reference/config#dev-proxy-same-origin-urls-no-cors)
  gives each service a stable hostname.
- **⚡ menu** — run any of the repo's `shortcuts` (install, migrate, lint,
  test…) in the resolved workspace env.

<Shot text="Service board — columns per repo, cards per service" />

## Terminals

Open a terminal on any workspace or attach a service's output as a tab.
Terminals are live PTY sessions — a real shell, mirrored in the app, not a
polled log buffer. A terminal keeps running independently of its tab:
closing the tab never stops the shell, so you can declutter without losing
work.

## Claude

Each workspace has a built-in **Claude** tab. It runs rooted at the
workspace (across all its repos' worktrees) and is wired to Pomelo's
[MCP tools](./workspace#agent-tools-mcp), so mid-task it can inspect which
port a service got, which database to migrate, whether a service is up —
and act on the real stack instead of guessing.

A Claude tab surfaces the agent's live state — **idle**, **working**, or
**awaiting input** — on the tab and the sidebar, so you can tell at a
glance when an agent needs a reply. To control the agent, use the
controls on its tab to **Restart** or **Stop**.

<Shot text="Claude tab — agent working inside a workspace" />

## Notifications

Long agent runs mean you're often doing something else while Claude works.
Pomelo posts a native macOS notification — a sound and a banner — when an
agent **finishes**, **asks for input**, or **compacts** its context, but only
for a workspace you're **not** currently viewing (no pings for what's already
on screen). Click the notification to jump straight to that workspace.

Turn it on with **Notify on Claude activity** in **Settings** (macOS asks for
notification permission the first time); there's a **Send test notification**
button to confirm it's working.

## Reviewing code & PRs

The sidebar PR pill pulls status straight from GitHub: per-branch checks,
review state, and **mergeability** (can it merge, and if not, why). Pomelo
never merges for you — it shows you where each PR stands and links out to
GitHub. PR data is fetched by exact head branch, cached, and served stale
while refreshing, so the UI never blocks on GitHub.

Pomelo talks to GitHub **directly over the GraphQL/REST API** — no `gh` CLI
required. Diffs, changed files and commits are read from your local git
worktree (fast, offline, no API cost); only PR list, description, reviewers,
comments and check status come from the API.

### Connecting GitHub

Pomelo only ever **reads** PRs, so it needs a read-only token. Add one in
**Settings ▸ Integrations ▸ Forge · GitHub**, then hit **Test**. Any of these
works:

- **`gh auth token`** — if you already use the GitHub CLI, paste its token
  (or `export GH_TOKEN=$(gh auth token)` in your shell). Nothing else to set up.
- **Classic PAT** — scope `repo` (needed to read private repositories).
- **Fine-grained PAT** — repository access to the repos you work on, with
  **Pull requests: Read-only**, **Contents: Read-only**, **Metadata:
  Read-only**. On an organization these require the org to approve the token.

The token is read from `GH_TOKEN`/`GITHUB_TOKEN` in your environment first,
otherwise from the encrypted app-local secret you saved. It is never written
to `pom.yml`.

## Themes

The app ships **three themes** — dark, light, and sepia — switchable from
the top bar. If your OS is set to minimize motion, the app honors it and
collapses animation.
