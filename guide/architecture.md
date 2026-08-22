# Architecture

How Pomelo is built, and the techniques it uses to stay fast and correct.
This page is the "how it actually works" companion to
[Concepts](./concepts) — read that first for the vocabulary.

## One binary, two front-ends

Pomelo ships as a **single Go binary** with no runtime dependencies beyond
`tmux`, `git`, and (optionally) `docker`. It exposes the same core two
ways:

- **CLI** — `pom <command>` for scripting and one-off actions.
- **Web dashboard** — bare `pom` starts an HTTP + WebSocket server and
  opens a browser UI. The React/Vite frontend is compiled and embedded
  into the binary with `go:embed`, so there is nothing separate to serve
  or deploy.

Both front-ends call the same internal packages, so behaviour never
drifts between them:

```
CLI       cmd/pom/*.go  ─┐
                           ├─▶  internal/services  ─▶  internal/tmux  ─▶  tmux
Web       internal/web    ─┘        (all side effects)          (subprocess)
                           └─▶  internal/pipeline (workspace lifecycle)
```

The web server is **stateless per request**: every panel reads live state
from `/api/*` and terminals stream over `/ws`. There is no server-side
session store to get out of sync with what tmux and git actually hold.

## Workspaces are git worktrees

A workspace is not a copy — it is one **git worktree per repo**, checked
out on the workspace's branch, living under `workspace--<branch>/`.
Worktrees share the object store with the main clone, so creating a
workspace is cheap in disk and instant to switch. Each workspace gets its
own env files, database names, and ports, so any number can run at
once without collision.

::: tip Workspace branch vs git branch
The folder name (`workspace--<branch>`) is the source of truth for env
resolution, hostnames, and database names — even if the underlying git
branch was later renamed. This keeps a workspace's identity stable.
:::

## Port management

Ports are the classic source of "works on my machine" collisions. Pomelo
sidesteps them: you never address a service by port — the
[dev proxy](../reference/config#dev-proxy) gives every app a stable domain
and resolves the current port for you — so the port itself is just an
internal detail that can be handed out freely.

- **Random, on demand.** Every `port: true` service gets a **random free
  port** from `10000–65535` on `127.0.0.1`, probed against the OS and
  reserved **atomically** by creating `ports.d/<port>` with `O_EXCL` — the
  filesystem's atomic create is the cross-process uniqueness guarantee, so
  any number of workspaces or sessions coexist without a shared lock or a
  pre-carved pool. No dedicated IP, no slots, no blocks to size.
- **Sticky while it runs, freed when it dies.** A service keeps its port
  for its lifetime; when it stops listening (crash, quit, force-quit) the
  port is released and the row removed. On restart it may get a fresh port
  — harmless, because the proxy re-resolves it. Shared services (Postgres,
  Redis, …) get their sticky port up front so connection strings stay
  stable.
- **A single-writer registry.** One goroutine owns the lease table and
  serves every claim/release through a channel (race-free by construction);
  readers — the proxy on every request — read a lock-free atomic snapshot.
  Durable state is the `~/.local/state/pom/ports.d/` directory (one file per
  port). Lifecycle: `assigned` → `starting` → `running`; a background reaper
  drives it from the port's own liveness, independent of tmux.
- **Observe it** with [`pom ports`](../reference/cli#ports) (add `--watch`
  to see ports claimed and freed live).

Templates surface the resolved values so config never hardcodes a port:

```yaml
env:
  PORT: "{{shared.web.port}}"          # this service's allocated port
  REDIS_URL: "{{shared.redis.url}}"   # user:pass@host:port for a shared service
```

## Service management

Each service runs as **one tmux window** inside the project's service
session (`tncli_<project>`). That gives you persistent, recoverable logs
for free — close the browser or kill `pom` and the windows keep
running; reconnect and they're still there.

- Services launch through `zsh -ic` (an **interactive** shell) so your
  `.zshrc` is sourced and version managers like `nvm`/`rvm` resolve the
  right toolchain — the single most common cause of "runs in my terminal
  but not under a task runner".
- A `pre_start` hook runs **after** the `cd` into the worktree but
  **before** the service command, for per-run setup.
- Long-running services wrap so the pane lingers on exit (you can read the
  crash), while one-shot commands auto-close. Dead panes are reaped by a
  background collector so a crashed service doesn't leak tmux windows.

### When env files are (re)generated

Env files are written from the resolved `env:` block at three moments,
and only then, so they always reflect current config without a manual
step:

1. Workspace **create**.
2. Service **start** (picks up config edits before the process launches).
3. Env-profile **switch**.

## Shared services

Shared services (Postgres, Redis, MinIO, OpenSearch, …) are containers
declared under `shared_services:` and started with a generated
**docker-compose override**. One set of containers backs every workspace;
isolation happens at the *data* layer, not by running N copies.

- **Capacity-based slots.** A service with a `capacity:` (for example, the
  16 logical Redis databases) hands each workspace a distinct slot index
  via `{{slot.NAME}}`, so workspaces share one Redis process but never
  collide on a DB index. Allocations live in `~/.local/state/pom/shared_slots.json`
  behind a slot lock (`withSlotLock`).
- **Start-on-demand dependency.** Starting a repo service first ensures
  its shared services are up (`docker compose up -d`) — you don't have to
  remember to boot infra first.
- **Dynamic ports.** Shared services publish on allocated ports surfaced
  through `{{shared.NAME.host}}`, `{{shared.NAME.port}}`, and `{{shared.NAME.url}}`, so two
  projects can each run their own Postgres without a port clash.
- **Lifecycle.** Once up, shared containers keep running (they're
  background infra with `restart: unless-stopped`) — they don't stop when
  you stop a repo service or delete a workspace. Control them from Settings
  › **Shared services**: start/stop/restart an individual container, or
  **Start all / Stop all / Tear down** the whole `<session>-shared` stack.
  Tear down removes the containers (freeing ports) but keeps the data
  volumes, so the next start comes back with your data.

## Config templates, validated at load

Environment switching uses **one** mechanism — `{{var:NAME}}`. A service
*publishes* a variable with `exposes:` (its local URL becomes the local
value); an `environments:<profile>` block supplies sparse remote
overrides under the same name. Every reference is checked when the config
loads, so a typo or renamed alias **fails loudly at startup** instead of
silently breaking a URL at runtime.

| Template | Resolves to |
| --- | --- |
| `{{var:NAME}}` | switchable value — local publisher URL or the active profile's override |
| `{{var:NAME \| ws}}` | same value, `http→ws` / `https→wss` |
| `{{shared.name.host}}` / `{{shared.name.port}}` | shared-service host / port |
| `{{shared.name.url}}` | `user:pass@host:port` for a shared service |
| `{{db.name}}` | named, session-prefixed, branch-resolved database |
| `{{slot.name}}` | capacity slot index for this workspace |
| `{{branch.safe}}` | workspace branch with `/` and `-` → `_` |

See [Templates](../reference/templates) for the full list.

## Onboarding & the Doctor {#onboarding-doctor}

Authoring a correct `pom.yml` for an unfamiliar project is the hard part, so
Pomelo ships an **onboarding harness** that does it for you. It follows a
gather → act → verify loop:

- **Gather** — the agent reads every repo: framework, monorepo apps, all
  long-running processes, the setup command, the shared services from every
  `docker-compose` (including `extends:` targets), and the repo aliases.
- **Act** — it authors `pom.yml` and wires env for every shared service,
  writing config through the MCP config tools (each write is
  schema-validated before it lands).
- **Verify** — it runs `config_doctor`, a **structured, machine-readable
  diagnosis** of whether the project is runnable: invalid config, missing
  docker/tools/repos, unset secrets, and shared services declared but never
  wired into any repo env. The agent loops on the result until the Doctor
  reports zero errors.

The whole thing is **portless and in-process** — `config_doctor` and the
config tools are built from the config on disk over `pom mcp`, with no
running dashboard and no port. Because it's one harness, both `pom onboard`
and the native desktop app's **New session** run the *same* agent, and any
fix agent gates on the *same* Doctor.

## The lifecycle pipeline

Creating and deleting a workspace runs as a **staged pipeline**. Per-repo
work (clone the worktree, run setup, write env, create databases) runs in
**parallel stages** with a `sync.WaitGroup`, and errors are collected
rather than aborting the whole run on the first failure.

Progress is emitted as `Event` structs over a channel. The CLI prints
them; the web dashboard streams the same events over
`/ws/workspace/{create,delete}` and renders an inline progress bar on the
workspace card. One source of truth, two renderings.

## What keeps the dashboard fast

The web layer is tuned so a busy project with many workspaces and repos
stays responsive:

- **Realtime agent state over SSE.** Claude/agent state (idle, working,
  awaiting input) is pushed to the browser over Server-Sent Events, so
  notifications are instant instead of polled. The state comes from Claude
  Code's own **lifecycle hooks** — when Pomelo opens an interactive Claude in
  a terminal it attaches a per-session settings file whose hooks report
  transitions (prompt submitted, tool run, turn finished, awaiting input) back
  to the dashboard over loopback. No terminal scraping, and it never touches
  your global Claude settings (the file is merged for that session only).
- **Batched PR fetch.** Pull-request status is fetched by **exact head
  branch** — one aliased GraphQL query per on-screen (repo, branch),
  batched into a few requests — rather than one `gh` call per repo. This
  is both complete (a branch resolves no matter how many open PRs its repo
  has) and minimal (only the branches on screen are fetched). The query
  returns the branch's most recent **open or merged** PR, so a merged
  branch keeps its merged chip instead of vanishing (abandoned/closed PRs
  are treated as noise and skipped). Results are cached per (repo, branch),
  served stale while refreshing, and warmed in the background so the UI
  never blocks on GitHub; a cold cache is warmed synchronously so badges
  appear on first paint.
- **GPU rendering, only where it counts.** Each terminal uses xterm.js;
  the WebGL renderer (the dominant memory cost) is attached **only to the
  visible tab**. One WebGL failure (no GPU, remote desktop) demotes the
  whole page to the DOM renderer instead of retrying on every tab switch,
  and after a renderer swap the grid is re-fit only if the cell metrics
  actually changed. Panes stream from tmux over a `pipe-pane` FIFO. The
  unicode11 addon (`activeVersion='11'`) gives wide CJK/emoji glyphs correct
  cell widths, so wide runs don't drift a column or glitch on scroll;
  `customGlyphs` draws box-drawing lines seamlessly and a minimum contrast
  ratio of 4.5 keeps dim text readable on any theme.
- **Batched streaming with real backpressure.** The server coalesces pane
  output for ~5&nbsp;ms before shipping one WebSocket message, so a fast
  build log is a few large frames instead of thousands of tiny ones. Flow
  control is ack-based (the same watermarks VS Code uses for its terminal):
  the client acknowledges bytes only **after xterm has parsed them**, and
  once ~100&nbsp;KB is unacknowledged the server stops reading the pane
  until the client drains below ~5&nbsp;KB. A program spraying output can't
  freeze the tab or balloon the socket buffer — the pipe just pauses.
- **Flat memory across tabs.** Only the active terminal tab plus a small
  most-recently-used window stays mounted; the rest unmount and free their
  xterm + socket. tmux holds the real pane state, so re-selecting a
  suspended tab remounts and resyncs from a fresh `capture-pane` snapshot.
  Memory stays roughly constant no matter how many tabs you open. A
  suspended tab has no live socket, so the client heartbeats its open pane
  ids to the server — the background orphan-reaper protects them and never
  kills a pane that still has an open (even if unmounted) tab.
- **Polite polling.** Polling pauses when the browser tab is hidden and is
  scoped and batched (one endpoint over many) to avoid request storms.

## Frontend design

The dashboard is a React + Vite single-page app (state in Zustand),
compiled and `go:embed`-ed into the binary. A few principles keep it
coherent:

- **Semantic theming.** Colors are never hardcoded in components — every
  surface reads CSS variables driven by a `data-theme` attribute, so the
  three themes (dark / light / sepia) stay consistent everywhere, down to
  the diff viewer and PR panels. Adding a theme is one variable block.
- **Real state, mirrored.** Terminals are live tmux panes over a
  WebSocket, not logs polled into a buffer; agent state arrives over SSE.
  The UI reflects what tmux/git/GitHub actually hold, so it can't drift.
- **Bounded resource use.** WebGL renders only the visible tab; off-screen
  terminal tabs suspend (see "Flat memory across tabs" above); PR data is
  fetched by exact head branch and cached. Cost stays flat as workspaces,
  repos, and tabs grow.
- **Consistent motion.** One Apple-style easing curve, transform/opacity
  only (GPU-friendly), with a `prefers-reduced-motion` guard. Menus,
  popovers, toasts, modals, and press/hover feedback all share it.

## Concurrency & safety

- **Layered dashboard auth.** A foreign `Origin` is rejected outright on
  every route — a malicious web page can't reach the WebSocket even though
  WS ignores CORS, and that alone secures loopback, so `127.0.0.1` needs no
  token. LAN clients (a non-loopback TCP peer, judged from `RemoteAddr`,
  never a spoofable header) must present a per-install token, delivered
  once in the LAN launch URL and then stored as a cookie. Only the PWA
  manifest and icons are fully public.
- **Race-free config reloads.** The live config is held behind an atomic
  pointer; a reload swaps it wholesale while handlers and background loops
  keep reading a consistent snapshot. Runtime toggles (like a service's
  dev/build mode) live on the server, not on the shared config object.
- **Bounded subprocesses.** Anything that can touch the network (git
  fetch/pull/clone, gh, docker) runs with a timeout, so a hung remote can
  never wedge a request or a background loop.
- **File locks for shared state** — `WithProjectLock` guards
  `network.json`; `withSlotLock` guards `shared_slots.json`. No
  read-modify-write happens without a lock.
- **`exec.Command`, never a shell string** — arguments are passed as
  separate strings, so branch names and paths can't be interpolated into a
  shell. Where a multi-command pipeline is unavoidable, inputs are
  sanitized (`BranchSafe`) first.
- **`sudo` is confined to `pom setup`.** Every runtime command —
  `start`, `workspace create`, `proxy` — runs without elevated
  privileges.

## Remote, sync & the webhook relay

Pomelo can run headless on a server and be driven from a laptop — all built on
the same stateless server, no separate protocol:

- **Daemon.** `pom daemon` runs the dashboard as a launchd/systemd service and
  self-updates on a timer (smoke-testing the new binary before it goes live;
  `pom update --rollback` reverts).
- **Thin client.** `pom connect` stores a link; bare `pom` then runs a local
  reverse proxy that injects the token and keeps the browser's `localhost`
  Host (so the same-origin check passes with no token in the URL), and
  TCP-forwards each workspace's service ports 1:1 so baked `127.0.0.1:<port>`
  URLs resolve. `pom server <cmd>` runs a command on the server via an audited
  `/api/exec`.
- **Active push & failover.** With `sync.auto_push`, the server loop pushes
  branch commits plus an uncommitted-tree snapshot to `refs/pom-wip/<branch>`
  (a non-branch ref, GC'd hourly). `pom takeover` fast-forwards and restores
  that snapshot onto a clean tree; `pom handback` pushes it.
- **Webhook relay.** One loopback port fronts all workspaces: path prefixes
  fan out to every workspace (webhooks), while `host_routes`/`state_routes`
  proxy synchronously to a single workspace (OAuth callbacks — routed by Host
  or the `state` param so one allowlisted URL serves every branch). Any tunnel
  (Tailscale Funnel, ngrok, cloudflared, a reverse proxy) points at it — the
  relay is vendor-neutral.
