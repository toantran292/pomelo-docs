# Services

Each long-running process — a web server, a worker, a console — is a
**service**. Services run on Pomelo's own managed PTY holders, so logs
persist and you can re-attach across restarts.

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
| `cmd` | The shell line to run. With `port: true`, `$PORT` (the allocated port) and `$BIND_IP` (the address to listen on) are exported. Servers that default to localhost-only (vite) should pass `--host $BIND_IP`; 0.0.0.0 binders (puma, next) need nothing. |
| `port: true` | Request a conflict-free port. |
| `exposes` | Variable name(s) this service publishes — its local URL becomes the value of `{{var:NAME}}`. Scalar or list. |
| `environments` | Profiles offered for this service (overrides the repo-level list). Empty = inherit. |
| `env` | Extra env vars merged over repo-level env. Templates allowed. |
| `pre_start` | One-shot command run after `cd` but before `cmd` (e.g. `nvm use`). |
| `dir` | Subdirectory inside the worktree to `cd` into. |
| `mode` + `modes` | Two-state toggle (e.g. `dev` vs `build`). Switch from the service card. |

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
        cmd: vite --port $PORT --host $BIND_IP
        port: true
        env:
          VITE_API: "{{var:API_URL}}"   # local URL, or staging override
```

`environments:` (repo or service level) lists which profiles a service
offers. With more than just `local`, the Environment menu appears so you
can point that service at a deployed backend. Profile overrides live
under the top-level [`environments`](../reference/config#environments-profiles).

## Start / stop

From the **service board**, use the start/stop control on any service
card, or a repo column's menu to **Start all / Stop all** of that repo's
services at once.

::: tip Ports never collide
Each `port: true` service gets a **random free port** reserved atomically,
so any number of workspaces coexist without a shared pool. Starting a
service checks its port first; if something else grabbed it, Pomelo moves
the workspace to a clean region rather than starting on a taken port. You
never address services by port anyway — the
[dev-proxy](../reference/config#dev-proxy-same-origin-urls-no-cors) gives
each a stable hostname.
:::

## Shortcuts (the ⚡ menu)

Declare quick commands per repo and run them from the bolt **⚡ menu** on a
service card. Each runs in the worktree with the workspace's resolved env
already sourced, so `DATABASE_URL` and friends point at the right ports:

```yaml
repos:
  api:
    shortcuts:
      - cmd: bundle exec rake db:migrate
        desc: Migrate DB
      - cmd: bundle exec rspec
        desc: Run tests
```

## Live preview & terminals

Each service card shows a **live output preview**. Click the card body to
attach a full terminal tab — a real PTY you can scroll, search, and type
into for an interactive REPL.

Terminals you open (or shortcut runs) live independently of their tab:
**closing a tab never stops the shell**. It keeps running and you can
re-attach a tab to it later; it's only stopped when you explicitly stop it.

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

Flip between modes from the service card; the active mode persists across
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

The hook runs after `cd` into the worktree, before `cmd`. Failures abort
startup.
