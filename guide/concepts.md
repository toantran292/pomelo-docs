# Concepts

A short tour of the moving parts before you dive deeper.

## Workspace

A **workspace** is one isolated copy of your project, anchored to a git
branch. Pomelo creates it as a sibling folder named `workspace--<branch>/`
containing one git worktree per repo. Each workspace has its own:

- Branch checkout for every repo it includes
- Database names (auto-resolved from `{{branch_safe}}` templates)
- Port block (a 100-port chunk out of the shared pool)
- Env files written from the per-repo `env:` block

You can run several workspaces side by side; their ports, databases, and
worktrees never collide.

## Repo

A **repo** is one source directory listed under `repos:` in `pom.yml`.
Each repo declares its own setup commands, env templates, shared
services, and named services. A workspace contains one git worktree per
repo it activates.

## Service

A **service** is a long-running process — a web server, a worker, a
shell. Each service lives in its own tmux window inside the workspace's
service session, so logs are persistent and recoverable.

```yaml
services:
  web:
    cmd: bundle exec puma -p $PORT
    port: true              # request a port from the workspace block
  worker:
    cmd: bundle exec sidekiq
```

## Shared services

Containers shared across all workspaces — Postgres, Redis, MinIO, etc. —
declared under `shared_services:`. Pomelo starts them with docker-compose
and exposes them on dynamic ports referenced via `{{port:NAME}}` and
`{{conn:NAME}}` templates.

```yaml
shared_services:
  postgres:
    image: postgres:16
    ports: ["5432"]
    db_user: postgres
    db_password: postgres
```

## Combo

A **combo** is a named set of repos you want to spin up together —
useful when your project has more than a handful of services and only a
subset matters for a given task.

```yaml
combos:
  full: [api, client, admin]
  api-only: [api]
```

## Session

Pomelo runs your services inside a tmux **service session**
(`tncli_<project>`) that holds one window per running service. It
survives closing the browser or killing `pom` — reconnect and the
windows are still there.

The web companion (bare `pom`) attaches to that service session over
WebSocket and mirrors each pane in the browser with xterm.js, so you can
read logs and shell in without leaving the dashboard.

## Pipeline

Workspace creation and deletion run as a multi-stage **pipeline**, with
parallelizable per-repo stages. The web dashboard surfaces progress
live; the CLI streams the same events. See [Workspace lifecycle](./workspace).
