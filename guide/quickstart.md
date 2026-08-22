# Quick Start

## The fastest start: `pom init`

In an existing git repo, let Pomelo scaffold a project for you:

```bash
cd my-app
pom init            # clones this repo into a new project + writes a working pom.yml
cd ~/pom/my-app     # the path it prints
pom                 # opens the dashboard
```

`pom init` detects your stack (npm/pnpm/yarn, Rails, Django, Go, Rust…), writes
a `pom.yml` with a runnable service, and carries your uncommitted changes — your
original repo is untouched. Add more repos, databases and env as you go, or
start from the full config below. Run `pom doctor` any time to check your setup.

Want a repo to try it on? Clone the example:

```bash
git clone https://github.com/toantran292/pomelo-example
cd pomelo-example && pom init
```

For a non-trivial project (multiple services, databases, env), add `--claude`:
`pom init --claude` scaffolds the basics, then hands off to an **interactive
`claude` session** that reads your repo and asks you about services, ports,
databases and env before writing a tailored `pom.yml` — it asks rather than
guesses. (Requires the `claude` CLI.)

## Hands-off onboarding: `pom onboard`

To skip writing config entirely, let an autonomous agent do it:

```bash
pom onboard --new my-app --repo . --repo ../another-service
```

This scaffolds a session (clones each `--repo`, writes a seed `pom.yml`),
then the agent reads every repo — framework, monorepo apps, long-running
processes, setup command, shared services from every `docker-compose`, and
repo aliases — authors a correct `pom.yml`, wires env for every shared
service, and loops the [Doctor](architecture#onboarding-doctor) until it
reports zero errors. Point it at an existing session (`pom onboard <name>`)
to re-run it. The native desktop app runs the **same** agent automatically
after **New session** — you just add repos and it writes the config for you.

## 1. Or write `pom.yml` by hand

In your monorepo root:

```yaml
session: myproject
default_branch: main

shared_services:
  postgres:
    image: postgres:16
    ports: ["5432"]
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    db_user: postgres
    db_password: postgres

repos:
  api:
    default_branch: master
    preset: shared-infra
    databases:
      main: "{{branch.safe}}"
    env:
      DATABASE_URL: "postgres://{{shared.postgres.url}}/{{db.main}}"
    setup: [bundle install, bundle exec rake db:migrate]
    services:
      web:
        cmd: bundle exec puma -p $PORT
        port: true
        exposes: API_URL        # other repos reference it as {{var:API_URL}}
```

## 2. First-time setup

```bash
pom setup
```

Installs prerequisites and shared service containers.

## 3. Create a workspace

```bash
pom workspace create feature-x
```

Creates `workspace--feature-x/api/` as a git worktree on branch `feature-x`, runs `setup`, creates databases.

## 4. Open the dashboard

```bash
pom              # launches the web dashboard and opens your browser
```

On your own machine `http://127.0.0.1:8765` just works — no token needed.
(Websites open in your browser still can't reach it: cross-origin requests
are rejected outright.) To open the dashboard from **another device on
your LAN**, use the printed LAN URL — it carries a one-time **access
token** (`?token=…`) that authenticates that device; the browser stores it
as a cookie after the first visit. Run `pom web url` to print both URLs
again.

From the dashboard you can start and stop services, watch live logs, and
shell into any tmux pane — all backed by the service tmux session over
WebSocket.
