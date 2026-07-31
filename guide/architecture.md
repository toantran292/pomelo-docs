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
own env files, database names, and port block, so any number can run at
once without collision.

::: tip Workspace branch vs git branch
The folder name (`workspace--<branch>`) is the source of truth for env
resolution, hostnames, and database names — even if the underlying git
branch was later renamed. This keeps a workspace's identity stable.
:::

## Port management

Ports are the classic source of "works on my machine" collisions. Pomelo
removes the guesswork with a **deterministic, layered allocation** that is
persisted so a service keeps the same port across restarts.

- **A dedicated IP (optional, recommended).** `pom setup` gives services
  their own loopback IP (`127.0.0.2`) so no port can ever collide with
  other software on the machine, and the pool widens to `10000–49999`.
  Shared docker services stay on `127.0.0.1` (database clients keep
  working unchanged). Without it, everything runs on `127.0.0.1` with the
  classic `40000–49999` pool — if the IP can't be bound, Pomelo falls
  back automatically.
- **The pool** is divided into **blocks** — one per workspace; every
  `port: true` service draws a stable offset inside its block. Block size
  is **not fixed**: it adapts to your config (service count plus a small
  margin, rounded), and re-adapts when the config changes — but only
  while nothing is running, so a port never moves under a live service.
  While something runs the layout can only grow, never shift.
- **Stable indices** live in `.tncli/network.json` per project:

  ```json
  {
    "slot": 0,
    "blocks":      { "ws-feature-x": 3 },
    "service_map": { "api/web": 1, "api/worker": 2 },
    "shared_map":  { "redis": 0, "postgres": 1 }
  }
  ```

  `blocks` maps a workspace to its port block; `service_map` fixes each
  service's offset within the block; `shared_map` fixes each shared
  service's offset from the shared base. Because the maps are persisted,
  ports are **reproducible** — restart a service and it lands on the same
  port every time.
- **Session slots** (`~/.local/state/pom/slots.json`) assign a global slot per
  session so two sessions on the same machine never overlap on ports.
  `max_sessions` — how many projects may run at once — is the **only
  knob** (Settings › **Pomelo (global) › Sessions & slots**, stored in
  `~/.local/state/pom/config.json`, machine-wide); slot size and
  workspaces-per-session derive from it and the config automatically. A session is assigned its
  slot **the first time it starts a service** and **keeps it until the
  session is deleted** — `slots.json` is the single authority for
  session→slot, so ports stay stable across restarts and can never collide.
  When every slot is assigned, the session switcher warns and starting a
  port-consuming service in an unassigned session is hard-blocked (rather
  than binding against a bogus slot and dying). To free a slot without
  deleting the session, use **Release slot** (the ✕ on a session's slot tag,
  or its right-click menu). As a safety measure this first **stops all of
  that session's services and its shared stack** (so the ports are actually
  freed and the next session to claim the slot can't collide) — agents like
  Claude, which hold no port, keep running. The session keeps its files and
  re-claims a slot the next time it starts a service. Each session runs its
  own
  shared-service stack on its slot's
  ports, generated on demand — so two sessions each get an isolated
  Postgres/Redis without a port clash.

All reads and writes go through a **file lock** (`WithProjectLock`), so
concurrent workspace operations can't corrupt the map with a
read-modify-write race.

Templates surface the resolved values so config never hardcodes a port:

```yaml
env:
  PORT: "{{port:web}}"          # this service's allocated port
  REDIS_URL: "{{conn:redis}}"   # user:pass@host:port for a shared service
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
  via `{{slot:NAME}}`, so workspaces share one Redis process but never
  collide on a DB index. Allocations live in `~/.local/state/pom/shared_slots.json`
  behind a slot lock (`withSlotLock`).
- **Start-on-demand dependency.** Starting a repo service first ensures
  its shared services are up (`docker compose up -d`) — you don't have to
  remember to boot infra first.
- **Dynamic ports.** Shared services publish on allocated ports surfaced
  through `{{host:NAME}}`, `{{port:NAME}}`, and `{{conn:NAME}}`, so two
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
| `{{host:name}}` / `{{port:name}}` | shared-service host / port |
| `{{conn:name}}` | `user:pass@host:port` for a shared service |
| `{{db:name}}` | named, session-prefixed, branch-resolved database |
| `{{slot:name}}` | capacity slot index for this workspace |
| `{{branch_safe}}` | workspace branch with `/` and `-` → `_` |

See [Templates](../reference/templates) for the full list.

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
  notifications are instant instead of polled.
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
