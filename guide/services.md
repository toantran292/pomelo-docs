# Services

Each long-running process — a web server, a worker, a shell — is a
**service**. Services live in their own tmux windows so logs persist
and you can re-attach across restarts.

## Declare

In `pom.yml`:

```yaml
repos:
  api:
    services:
      web:
        cmd: bundle exec puma -p $PORT
        port: true
        exposes: API_URL
      worker:
        cmd: bundle exec sidekiq
      console:
        cmd: bundle exec pry
```

| Field | Notes |
| --- | --- |
| `cmd` | The shell line to run. `$PORT` is auto-substituted with the allocated port when `port: true`. |
| `port: true` | Request a port from the workspace's port block. The number is stable across restarts. |
| `exposes` | Variable name(s) this service publishes — its local URL becomes the value of `{{var:NAME}}`. Scalar or list. |
| `environments` | Profiles offered for this service (overrides the repo-level list). Empty = inherit. |
| `env` | Extra env vars merged over repo-level env. Templates allowed. |
| `pre_start` | One-shot command run after `cd` but before `cmd` (e.g. `nvm use`). |
| `dir` | Subdirectory inside the worktree to `cd` into. |
| `mode` + `modes` | Two-state toggle (e.g. `dev` vs `build`). Switch from the web UI or `pom restart`. |

## Publishing & switching URLs

A service that other services talk to should `exposes` a variable. The
variable's local value is this service's URL; consumers reference it as
`{{var:NAME}}` — never the alias, so renames don't break anything.

```yaml
repos:
  api:
    services:
      web: { cmd: ..., port: true, exposes: API_URL }
  web:
    environments: [local, staging]      # profiles offered here
    services:
      app:
        cmd: vite --port $PORT
        port: true
        env:
          VITE_API: "{{var:API_URL}}"   # local URL, or staging override
```

`environments:` (repo or service level) lists which profiles a service
offers. With more than just `local`, the Environment menu appears so you
can point that service at a deployed backend. Profile overrides live
under the top-level [`environments`](../reference/config#environments-profiles).

## Start / stop

From the web UI: use the start/stop controls on any service row, or the
repo's **⋯** menu for **Start all / Stop all** of that repo's services at
once. There's also a control to stop everything in the project.

::: tip Ports never collide
A service's port is deterministic per (workspace, service), and a workspace
only ever claims a port **region (block) that is entirely free**. Starting a
service checks its port first: if the region got contaminated (a stale
process, a crash leftover), Pomelo **moves the whole workspace to a fresh,
fully-free region** and starts there — it never starts on a taken port. Only
when there's no clean region left does it refuse, telling you what's holding
the port (`port 40200 is in use by node (pid 4123)…`); free it (kill it) or
run **Refresh Pomelo** / `pom refresh` to clear the session and reclaim
ports.
:::

From the CLI:

```bash
pom start <service|combo>
pom stop  [service|combo]   # no arg → stop all
pom restart <service|combo>
pom status                  # list running services with PIDs
pom refresh                 # clear this project's tmux session (free ports)
```

`pom refresh` is the CLI counterpart of the web **Refresh Pomelo** — it
kills the project's tmux session (every window) so stuck panes / orphaned
ports are released; worktrees, config and shared containers are untouched.

## Live terminals

Shells you open ("Open terminal", shortcut runs) live independently of their
tab. **Closing a tab never stops the shell** — it keeps running and appears
under **Live terminals** on the workspace Home, whether or not a tab is open
on it. Click one to (re)attach a tab; the shell is only stopped when you hit
its **×** there. This lets you close tabs to declutter without losing work.

The tab bar can sit on any edge — right-click a tab (or the **⌂** Home tab)
→ **Tab bar position** → top / bottom / left / right.

## Logs

In the web UI, selecting a service opens its tmux window live in an
xterm.js terminal — scroll and search the buffer, or type straight into
the service for an interactive REPL.

From the CLI:

```bash
pom logs <service>          # recent output (snapshot)
pom attach <service>        # attach the service's tmux window
```

`attach` drops you into the actual session — detach with the usual
tmux prefix + `d`.

## Modes (dev vs build)

For services that have a fast dev command and a slower production-like
build, declare both:

```yaml
services:
  web:
    mode: build                # default
    modes:
      dev: npm run dev -p $PORT
      build: npm run build && npx serve -l $PORT
    port: true
```

Flip between modes from the web UI; the active mode persists across
restarts.

## Pre-start hooks

Use `pre_start` at the repo or service level for environment shims that
need to run inside the same shell as `cmd`:

```yaml
repos:
  api:
    pre_start: nvm use
    services:
      web:
        cmd: npm start
```

The hook runs after `cd` into the worktree, before `cmd`. Failures
abort startup.
