# Concepts

A short tour of the moving parts before you dive deeper. Pomelo is a
**native macOS app** that runs a full, isolated dev environment per git
branch — no browser, no server to point at.

## Session (project)

A **session** is one project: a set of repos that belong together, plus
its config (`pom.yml`). You add repos to a session by folder or git URL;
Pomelo keeps them under one **workspace folder** you pick on first run.
Switch sessions from the top-left project chip in the app.

## Workspace

A **workspace** is one isolated copy of your project, anchored to a git
branch. Pomelo creates it as a sibling folder named `workspace--<branch>/`
containing one git worktree per repo. Each workspace has its own:

- Branch checkout for every repo it includes
- Database names (auto-resolved from `{{branch_safe}}` templates)
- Service ports (allocated on demand, conflict-free)
- Env files written from the per-repo `env:` block

You can run several workspaces side by side; their ports, databases, and
worktrees never collide.

## Repo

A **repo** is one source directory listed under `repos:` in `pom.yml`.
Each repo declares its own setup commands, env templates, services, and
databases. A workspace contains one git worktree per repo it activates.

## Service

A **service** is a long-running process — a web server, a worker, a
console. Each service runs on Pomelo's own managed PTY holder, so logs
persist and you can re-attach across restarts.

```yaml
services:
  web:
    cmd: bundle exec puma -p $PORT
    port: true              # request a conflict-free port
  worker:
    cmd: bundle exec sidekiq
```

Start and stop services from the **service board** in the app. See
[Services](./services).

## Shared services

Containers shared across all workspaces — Postgres, Redis, MinIO,
OpenSearch — declared under `shared_services:`. One set of containers
backs every workspace; isolation happens at the *data* layer (per-branch
databases, capacity slots), not by running N copies. Pomelo starts them
with docker-compose and exposes them on automatically allocated,
conflict-free ports.

```yaml
shared_services:
  postgres:                  # well-known: image/ports/creds filled in
  redis:
```

## Database

Each workspace gets its **own databases**, named from templates and
created automatically. `{{db.main}}` resolves to a session-prefixed,
branch-resolved name so two branches never share a database. New
workspaces can clone their databases from **main** (`seed_from_main`)
instead of migrating from scratch. See [Databases](./databases).

## Config doctor

The **config doctor** is a deterministic health check (no LLM): it reads
your `pom.yml` and the real state — tools installed, ports, databases,
services — and reports exactly what's missing or misconfigured to run the
project. It lives at the bottom of the **config editor** (Project) as a
health strip, so you always see whether the project is runnable.

## Onboarding agent

When you add repos to a new session, an **onboarding agent** (which uses
Claude) reads the code, infers how each repo runs, and writes a runnable
`pom.yml` — looping the config doctor until it reports clean. It authors
config for you instead of making you learn the schema up front. See
[Quick Start](./quickstart).

## Claude agent

Each workspace has a built-in **Claude** agent, opened as a tab. It runs
inside the workspace's worktrees and is wired to Pomelo's MCP tools, so it
can inspect the real running stack (ports, databases, service state) and
act on it. See [The app](./app).

## Pipeline

Workspace creation and deletion run as a multi-stage **pipeline**, with
parallelizable per-repo stages (clone worktrees, run setup, write env,
create databases). The app surfaces progress live. See
[Workspace lifecycle](./workspace).
