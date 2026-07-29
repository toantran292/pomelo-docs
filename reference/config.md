# `pom.yml` reference

The project config. `pom` walks up from the current directory looking
for this file — keep it at the monorepo root. (`tncli.yml` is still read as
a fallback, so existing projects keep working.)

## Splitting into multiple files

When one file gets unwieldy, drop a `pom.d/` directory next to `pom.yml`.
Every `pom.d/**/*.yml` (walked recursively, lexical order) is **deep-merged**
into the root on load, so the root stays a small index and the bulk lives in
fragments:

```
pom.yml                    # session, default_branch, jira, sync — a tiny index
pom.d/
  environments.yml
  presets.yml
  shared-services.yml
  repos/
    01-api.yml             # { repos: { api: … } } — NN prefix keeps repo order
    02-web.yml
```

Maps merge by key (a fragment's repos add to the root's), existing keys keep
their order and new ones append — so port/ordering stays stable. A single
`pom.yml` with no `pom.d/` works exactly as before.

To migrate an existing single file, run it once:

```bash
pom config split              # repos → pom.d/repos/NN-<name>.yml; big sections
                              # → pom.d/<section>.yml; tncli.yml → pom.yml
pom config split --dry-run    # preview without writing
```

It moves `repos`, `environments`, `presets` and `shared_services` into
fragments, backs the original up as `<name>.bak`, and leaves the small stuff
(session, defaults, jira, …) in the root. Comments ride along with each
moved section.

::: tip Editing a split config
The dashboard's **Settings → Raw YAML** is a multi-file editor: pick the root
`pom.yml` or any `pom.d` fragment and save it individually — each save is
validated against the full merged config before it lands. (The section *forms*
show the merged config read-only while split, since they can't tell which file
a field belongs to; use Raw YAML to edit.)
:::

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

**Well-known services ship with built-in defaults** — `postgres`, `redis`,
`minio`, and `opensearch`. Just name the service and Pomelo fills in the
image, ports, environment, volumes, healthcheck and credentials:

```yaml
shared_services:
  postgres:                    # full postgres:16 config, filled in
  redis:                       # redis:7-alpine + appendonly
  minio:
  opensearch:
```

Any field you set **overrides** the default (and `environment` maps merge):

```yaml
shared_services:
  postgres:
    image: postgres:15         # override just the version; the rest is default
  cache:
    type: redis                # a differently-named service picks a template via `type`
    capacity: 32               # override one field
```

Spell out everything for a **custom** (non-well-known) service:

```yaml
shared_services:
  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672", "15672"]
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
| `type` | Well-known template to base this service on (defaults to the service's name). |

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

## Archive

Optional. Controls the workspace → Markdown retrospective feature.

```yaml
archive:
  auto_on_merge: true      # default false
```

`auto_on_merge` makes Pomelo archive a workspace automatically once its
pull request merges (and no PR on that workspace is still open). Detection
runs in the server-side PR loop, so it works even with no browser open.
**Off by default** because generating an archive runs your `claude` CLI and
spends tokens. See [Workspace › Auto-archive on PR merge](../guide/workspace#auto-archive-on-pr-merge).

## Sync

Optional. Keeps `origin` current with each workspace's work, so you can
fetch the latest — including an agent's in-progress edits — and continue on
another machine.

```yaml
sync:
  auto_push: true          # default false
  interval_sec: 180        # how often to push (min 30)
```

When on, the server periodically (per branch worktree):

- pushes new commits on the branch to `origin` (fast-forward; a diverged or
  offline push is skipped quietly), and
- snapshots the **uncommitted** working tree (tracked + untracked, respecting
  `.gitignore`) to `refs/pom-wip/<branch>` and force-pushes that ref.

`refs/pom-wip/*` is a **non-branch ref**: it doesn't appear in the branch
list, open a PR, or trigger CI. It's created without touching your `HEAD` or
staging area, and an unchanged tree never churns a new push. Toggle it under
**Settings → Jira → Sync**. Runs server-side, so it keeps working with no
browser open (e.g. under the [daemon](../guide/install#run-at-login-daemon)).
