# `pom.yml` reference

The project config. `pom` walks up from the current directory looking
for this file — keep it at the monorepo root.

## Top level

```yaml
session: myproject              # tmux session prefix (tncli_<session>)
default_branch: main            # global default git branch
preset: dev-tools               # optional preset name applied to every repo
local_pm: pnpm                  # when "pnpm", rewrite npm/yarn installs to pnpm

environments:                   # profiles — sparse variable overrides
  staging:                      # each key is a VARIABLE name (see `exposes`),
    API_URL: "https://api.acme.dev"    # value overrides local
    WEB_URL: "https://web.acme.dev"

presets: { ... }                # see "Presets" below
shared_services: { ... }        # see "Shared services" below
repos: { ... }                  # see "Repos" below
ui: { editor: cursor }          # see "UI" below
```

### Environments (profiles)

An environment is a **profile**: a sparse map of `variableName → value`.
`local` is implicit. A profile only lists the variables whose value
differs from local. Variables are published by services via
[`exposes`](#services), and referenced anywhere as `{{var:NAME}}`. Each
service declares which profiles it offers via `environments: [...]`, and
you switch a service's active profile from the Environment menu. See
[Services → publishing & switching URLs](../guide/services#publishing-switching-urls).

```yaml
environments:
  staging:
    API_URL: "https://api.acme.dev"
  prod:
    API_URL: "https://api.acme.io"
```

## Repos

```yaml
repos:
  api:
    alias: api                 # display label only — never referenced
    default_branch: master     # override global default for this repo
    preset: shared-infra       # apply a preset
    pre_start: nvm use         # one-shot hook before any service runs
    environments: [local, staging]   # profiles offered to this repo's services

    # worktree-time config
    copy: [.env, .env.secrets] # files copied from repo to worktree
    databases:                 # named — auto-created per workspace
      main: "{{branch_safe}}"
      test: "{{branch_safe}}_test"
    env:                       # env templates (resolved per workspace)
      DATABASE_URL: "postgres://{{conn:postgres}}/{{db:main}}"
      WEB_HOST: "{{var:WEB_URL}}"
    setup:                     # run after worktree exists
      - bundle install
      - bundle exec rake db:migrate

    # runtime
    shortcuts:                 # quick commands surfaced in the web UI
      - cmd: bundle install     # runs in the worktree with the workspace's
        desc: Install deps      # resolved env (.env.local) already sourced,
                                # so DATABASE_URL etc. point at the right ports
    services:
      web:
        cmd: bundle exec puma -p $PORT
        port: true
        exposes: API_URL       # publishes this service's URL as API_URL
      worker:
        cmd: bundle exec sidekiq
```

| Field | Description |
| --- | --- |
| `alias` | Display label in the web UI. **Not** referenced by templates — rename freely. |
| `default_branch` | Override the global default branch for this repo. |
| `pre_start` | One-shot command run before any service in this repo (e.g. `nvm use`). |
| `environments` | Profiles offered to this repo's services (default `[local]`). A service can narrow it. |
| `copy` | Files copied from the source repo into each worktree. |
| `env` | Env vars to generate. Flat map → `.env.local`, or file-keyed (see below). Uses [templates](./templates). |
| `databases` | **Named** map (`name: template`); auto-created per workspace. Referenced as `{{db:name}}`. |
| `setup` | Commands run after worktree creation. |
| `pre_delete` | Commands run before worktree deletion. |
| `shortcuts` | Quick commands surfaced in the web UI. |
| `services` | Named services. See [Services](../guide/services). |

### `env`: one key, three forms

There is no separate `env_output` — the `env` key both holds the
variables and decides the target file(s):

```yaml
# 1. Flat → written to .env.local
env:
  DATABASE_URL: "postgres://{{conn:postgres}}/{{db:main}}"

# 2. File-keyed → each file gets exactly its own vars
env:
  .env.development.local:
    DATABASE_URL: "postgres://{{conn:postgres}}/{{db:dev}}"
  .env.test.local:
    DATABASE_URL: "postgres://{{conn:postgres}}/{{db:test}}"

# 3. File-keyed + shared base ("*" applies to every file)
env:
  "*":
    WEB_HOST: "{{var:WEB_URL}}"
  .env.development.local:
    DATABASE_URL: "postgres://{{conn:postgres}}/{{db:dev}}"
  .env.test.local:
    DATABASE_URL: "postgres://{{conn:postgres}}/{{db:test}}"
```

A file-specific value overrides `"*"`.

## Shared services

```yaml
shared_services:
  postgres:
    image: postgres:16
    ports: ["5432"]
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes: ["shared_postgres:/var/lib/postgresql/data"]
    healthcheck:
      test: pg_isready -U postgres -h 127.0.0.1
      interval: 5s
      timeout: 3s
      retries: 3
    db_user: postgres
    db_password: postgres
    capacity: 16               # max slots per instance
```

Host ports are dynamically allocated from the workspace pool; you never
hard-code them.

| Field | Description |
| --- | --- |
| `image` | Docker image. |
| `ports` | Container ports; host ports are picked from the dynamic pool. |
| `environment` | Container env vars. |
| `volumes` | Volume mounts. |
| `command` | Override container command. |
| `healthcheck` | Pomelo waits for the healthcheck before marking the service ready. |
| `db_user` / `db_password` | Credentials for auto database creation. |
| `capacity` | Max slots per instance (auto-scales when exceeded). |

## Presets

Reusable repo fragments:

```yaml
presets:
  shared-infra:
    env:
      REDIS_URL: "redis://{{host:redis}}:{{port:redis}}/{{slot:redis}}"
```

A repo with `preset: shared-infra` inherits those fields. Multiple
presets can be applied via a list: `preset: [shared-infra, prisma]`.

## UI

Optional. The only setting is the editor launched by "Open in editor":

```yaml
ui:
  editor: cursor                # GUI editor only: code | cursor | zed | windsurf | subl
```

Theme (dark / light / sepia) and language are chosen in the web dashboard,
not in config.

## Jira

Optional. Links each workspace to its Jira issue (read-only): the workspace
branch's leading `<project>-<number>` (e.g. `feat-123-add-login` →
`FEAT-123`) is resolved and shown as a status chip on the workspace card —
click it to open the issue. The API token is **never stored in config**;
`token_env` names the environment variable that holds it. Configure it in
the dashboard under Settings › **Jira** (which has a **Test connection**
button that verifies the site, email and token against Jira), or by hand:

```yaml
jira:
  site: https://your-org.atlassian.net
  email: you@example.com
  token_env: JIRA_API_TOKEN      # export this in your shell before launching
```

Create a token at **id.atlassian.com → Security → API tokens**, then
`export JIRA_API_TOKEN=…`. When creating a workspace, the **Jira ticket**
field is required and becomes the branch prefix (ticket `FEAT-123` +
description "add login" → branch `feat-123-add-login`), so the chip resolves
automatically.
