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
      main: "{{branch_safe}}"
    env:
      DATABASE_URL: "postgres://{{conn:postgres}}/{{db:main}}"
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
