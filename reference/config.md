# `pom.yml` reference

The project config. Pomelo walks up from the current directory looking
for this file — keep it at the monorepo root.

## Splitting into multiple files

When one file gets unwieldy, drop a `pom.d/` directory next to `pom.yml`.
Every `pom.d/**/*.yml` (walked recursively, lexical order) is **deep-merged**
into the root on load, so the root stays a small index and the bulk lives in
fragments:

```
pom.yml                    # session, default_branch, jira — a tiny index
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

You don't have to split — a single `pom.yml` works exactly as before. When you
do, keep the small stuff (session, defaults, jira, …) in `pom.yml` and move
`repos`, `environments`, `presets` and `shared_services` into fragments under
`pom.d/`. Order is lexical, so prefix repo files (`01-`, `02-`) to keep repo
order stable.

::: tip Editing a split config
The app's **Project** config editor opens the merged view; when the config is
split it resolves the right `pom.d/**` fragment automatically. Every save is
validated against the full merged config before it lands.
:::

## Top level

```yaml
session: myproject              # project name (namespaces state, holders, databases)
default_branch: main            # global default git branch
preset: dev-tools               # optional preset name applied to every repo

environments:                   # profiles — sparse variable overrides
  staging:                      # each key is a VARIABLE name (see `exposes`),
    API_URL: "https://api.acme.dev"    # value overrides local
    WEB_URL: "https://web.acme.dev"

presets: { ... }                # see "Presets" below
shared_services: { ... }        # see "Shared services" below
repos: { ... }                  # see "Repos" below
```

::: tip Editor is a per-user app setting
Which GUI editor ⌘E opens (VS Code, Cursor, Zed, …) is chosen in the app's
**Settings › General**, not in `pom.yml` — it's a personal preference, not
shared project config.
:::

### Environments (profiles)

An environment is a **profile**: a sparse map of `variableName → value`.
`local` is implicit. A profile only lists the variables whose value
differs from local. Variables are published by services via
[`exposes`](#services), and referenced anywhere as `{{var:NAME}}`. Each
service declares which profiles it offers via `environments: [...]`, and
you switch a service's active profile from the Environment menu. See
[Services → publishing & switching URLs](../docs/services#publishing-switching-urls).

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
    shortcuts:                 # quick commands surfaced in the ⚡ menu
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
| `seed_from_main` | Clone this repo's DBs from the **main** workspace's copies instead of creating them empty; skips the repo's `seed`. See below. |
| `setup` | Commands run after worktree creation. Runs the package manager exactly as written. |
| `pre_delete` | Commands run before worktree deletion. |
| `shortcuts` | Quick commands surfaced in a service card's ⚡ menu. |
| `services` | Named services. See [Services](../docs/services). |

### Faster workspaces — inherit prepared state from `main`

Set up the **main** workspace once (install deps, migrate + seed its DBs) and
new workspaces copy that prepared state instead of rebuilding it. `main` runs
services normally — it's the golden source.

```yaml
repos:
  api:
    seed_from_main: true   # clone api's DBs from main (CREATE DATABASE … TEMPLATE)
```

- **Databases** — `seed_from_main: true` clones the repo's DBs from main's
  counterparts in seconds (with main's sample data) rather than creating them
  empty + re-seeding; the repo's own `seed` is skipped. Missing main DB → empty
  create fallback.
- **node_modules** — a fresh worktree seeds `node_modules` from a hash-keyed
  store built off main's installed copy, materialized copy-on-write (APFS
  clonefile / Linux reflink) so the install is a near-no-op and the tree shares
  disk blocks. Automatic for non-pnpm repos; pnpm repos are skipped (pnpm's own
  store already dedupes). Keyed by lockfile hash, so bumping deps on one branch
  doesn't disturb others.
- **Long branch → short workspace name** — creating a workspace from a very long
  branch derives a concise workspace name (folder + hostnames) via a one-shot
  `claude` call, while the long branch stays the git branch each repo checks
  out. So a long `feat-123-add-a-really-long-descriptive-…` branch becomes a
  short `workspace--feat-123-add-login` with clean
  `api.feat-123-add-login.localhost` hostnames.

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

### Fixed shared ports — `shared_stable_ports`

By default a shared service's host port is random (freed and re-picked as the
port pool moves). If you want to configure an external tool once — **DataGrip**,
`psql` — pin them:

```yaml
shared_stable_ports: true
shared_services:
  postgres:
  redis:
  minio:
  opensearch:
```

Each shared service is then pinned to the same deterministic local port
(`20000–29999`, a pure function of session + service name). The generated
docker-compose publishes those ports and `{{shared.<name>.url}}` /
`{{shared.<name>.port}}` agree — so `localhost:<port>` never changes across
restarts.

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

## Jira

Optional. Links each workspace to its Jira issue (read-only): the workspace
branch's leading `<project>-<number>` (e.g. `feat-123-add-login` →
`FEAT-123`) is resolved and shown as a status chip on the workspace card —
click it to open the issue. The API token is **never stored in config**;
`token_env` names the environment variable that holds it. Set it in
`pom.yml`:

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
runs in the PR watch loop. **Off by default** because generating an archive
runs your `claude` CLI and spends tokens. See
[Workspace › Auto-archive on PR merge](../docs/workspace#auto-archive-on-pr-merge).

## Webhook fan-out

Optional. Runs a **single-port** relay that receives external webhooks and
**duplicates** each to every workspace running the target service — so all
your parallel branches receive the same event (each has its own database, so
processing is independent). No more re-pointing a tunnel at one branch at a
time.

```yaml
webhook:
  # listen_port: 8766       # optional — a fixed relay port
  routes:
    "/api": api              # → the "api" repo's sole service, in every workspace
    "/hooks": web/server     # → a specific service: <alias>/<svc>
```

The relay is a loopback **control port**, not a workspace-pool port. There's
one relay per running app and it follows whichever session is active. Set
`listen_port` to pin a fixed number.

How a request is handled:

1. The relay matches the request path against `routes` by **longest prefix**
   (`/api/webhooks/stripe` → `/api`).
2. The prefix is **stripped**, so the app receives `/webhooks/stripe` — define
   your route without the prefix. Query string, headers (including the
   provider's **signature**) and the raw body are forwarded unchanged.
3. It resolves that service's port in **every leased workspace** and forwards
   to the ones currently listening; stopped workspaces are skipped.
4. It **ACKs `200` immediately**, then fans out in the background — one slow or
   down branch never makes the provider retry.

A route target is a repo **alias** (uses that repo's sole service) or
`alias/svc` to pick one. The relay is bound to loopback.

### OAuth callbacks — one URL, routed by `state`

A **webhook** (a Stripe event) is safe to fan out. An **OAuth callback**
(`…/auth/callback?code=…`) is not: the `code` is single-use and must return to
the exact workspace that started the flow. And OAuth providers require the
redirect URI to be **allowlisted exactly** (no wildcards) — so a per-branch
hostname means adding every branch to the provider, forever.

The fix: allowlist **one** callback URL and route by the OAuth `state` param
(which the provider echoes back). The workspace prefixes `state` with
`pom~<branch>~`:

```yaml
webhook:
  state_routes:
    "/api/v1/oauth/callback": api   # → the workspace named in ?state=
```

The app builds `state` from the `{{branch.host}}` template, so each workspace
identifies itself:

```yaml
env:
  # the app appends its own CSRF: state = "pom~{{branch.host}}~" + csrf
  POM_OAUTH_STATE_PREFIX: "pom~{{branch.host}}~"
```

So `feat-login` sends `state=pom~feat-login~…`; the callback hits the single
allowlisted URL; the relay reads `state`, forwards **only** to `feat-login`, and
returns its real response (the redirect). New branches need **no** provider
change.

#### `host_routes` (subdomain) — only for wildcard-friendly cases

If a service is reachable at a fixed/wildcard hostname (not gated by OAuth
allowlisting), route by Host instead:

```yaml
webhook:
  host_routes:
    "app.example.com": api   # <branch>.app.example.com → that ONE workspace
```
with a Cloudflare **wildcard** `*.app.example.com` and per-workspace URLs
via `{{branch.host}}`. For OAuth providers that demand exact redirect URIs,
prefer `state_routes` above.

**Cloudflare Tunnel setup:** point **one** public hostname's Service URL at
`http://localhost:<relay-port>` and leave **Path** empty — the relay does the
per-service routing. (A tunnel Service URL is `scheme://host:port` only; it
can't contain a path.)

## Dev proxy (same-origin URLs, no CORS)

Optional. Instead of remembering `127.0.0.1:40002` per service, browse each
workspace at a **hostname** — and, crucially, put a frontend and the backends
it calls **under one origin** so the browser makes same-origin requests: **no
CORS, and cookies behave like production**. `<branch>.localhost` auto-resolves
to loopback (no `/etc/hosts`). One loopback control port fronts everything; the
underlying per-service ports stay allocated as usual — the proxy just hides
them behind hostnames.

**Single-frontend app** — `<branch>.<domain>`, path-routed:

```yaml
proxy:
  # listen_port: 8767      # optional
  # domain: localhost      # optional; <branch>.<domain>
  paths:
    "/be/api": api          # <branch>.localhost:8767/be/api → the api service
    "/": web                # everything else → the web (frontend) service
```

**Multiple frontends (a mesh)** — one origin per frontend, `<app>.<branch>.<domain>`:

```yaml
proxy:
  apps:
    web:   { frontend: web,   backends: { "/be/api": api, "/be/worker": worker } }
    admin: { frontend: admin, backends: { "/be/api": api } }
```

so `web.feat-login.localhost:8767/` serves the web app and
`web.feat-login.localhost:8767/be/api/…` hits the api service — same origin.
Set each frontend's API base to the same-origin path (Pomelo controls env, so
no frontend code changes):

```yaml
env:
  NEXT_PUBLIC_API_URL: "http://web.{{branch.host}}.localhost:8767/be/api"
```

::: warning Server-side frontends (Next.js): don't reuse `/api`
The frontend is the **default** — every path that doesn't match a backend
prefix goes to it, including a Next.js app's own `/api/*` routes, `/_next/*`
and server actions. So route backends under a **distinct** prefix (e.g.
`/be/api`), **never** `/api` or `/_next`, or you'll hijack the framework's own
server-side routes.
:::

The app's **Open** / **Copy URL** actions prefer these proxy URLs
automatically whenever the proxy is listening — the raw `ip:port` form is only
the fallback. So if **Open** hands you a raw `127.0.0.1:port` (and an app that
expects same-origin backends 404s), the proxy isn't running: the config has no
`proxy:` block, or it was added while Pomelo was already up. The proxy starts
automatically when configured — at launch and again after any config reload —
so add the block, reload, and the hostnames come up.

The proxy binds **both** `127.0.0.1` and `::1` (macOS resolves `*.localhost`
to `::1` first). For clients that don't special-case `.localhost`, set
`domain: localtest.me` (a public wildcard → `127.0.0.1`, zero setup).

A DNS label is capped at 63 characters, so a very long branch name is
shortened to a truncated prefix plus a short hash (e.g.
`web.a-very-long-branch-name-…-a1b2c3d4.localhost`) — otherwise the browser would
refuse to resolve it. The hash keeps distinct long branches unique; the
hostname is stable for a given branch.
