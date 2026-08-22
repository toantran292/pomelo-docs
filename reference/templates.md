# Template variables

The values in `env:`, `databases:`, `services.<name>.cmd`, and a handful
of other fields are templates. Pomelo resolves them when materializing
each workspace, substituting values from the network state, shared
services, other services, and the workspace's branch.

Templates use **dot-notation**: `{{ <source>.<name>[.<field>] }}`. Every
reference is **validated at load** — a typo, a renamed alias, or a missing
database name fails loudly with a clear error instead of breaking silently
at runtime.

## Catalog

| Template | Resolves to | Example |
| --- | --- | --- |
| `{{shared.<name>.url}}` | Shared service conn `user:pass@host:port` | `postgres:postgres@localhost:44800` |
| `{{shared.<name>.host}}` | Shared service host (always `localhost` on the host) | `localhost` |
| `{{shared.<name>.port}}` | Shared service port | `44800` |
| `{{shared.<name>.user}}` / `.pass` | Shared service credentials | `postgres` |
| `{{shared.<name>.slot}}` | Capacity slot index (e.g. Redis DB number) | `3` |
| `{{db.<name>}}` | Named database (session-prefixed, branch-resolved) | `myproject_feat_login` |
| `{{db.<name>.url}}` | Full `postgres://…/<db>` URL via the shared postgres | `postgres://…:44800/myproject_feat_login` |
| `{{<repo>.<service>.url}}` | A service's base URL (profile-aware) | `http://api.api.feat-login.localhost:41000` |
| `{{<repo>.<service>.path}}` | Same-origin dev-proxy path | `/_pom_dev/api/api` |
| `{{<repo>.<service>.host}}` / `.port` / `.ws` | Service host / port / ws URL | `…` |
| `{{secret.<NAME>}}` | Value from the secrets store | `sk_live_…` |
| `{{slot.<name>}}` | Allocated slot index for capacity-limited services | `3` |
| `{{branch.safe}}` | Branch with `/`→`_`, `-`→`_` (safe for DB names) | `feat_login` |
| `{{branch.host}}` | Branch as a DNS label (`a-z0-9-`) | `feat-login` |
| `{{branch.hash}}` | Short stable hash of the branch | `a1b2c3` |
| `{{bind_ip}}` | Service bind address — always `127.0.0.1` | `127.0.0.1` |

## Shared services: `{{shared.<name>.*}}`

Wire every declared shared service into the repos that use it. A shared
service you declare but never reference is flagged by `pom` (the config
doctor calls it *unwired*) — its container starts but nothing connects.

```yaml
shared_services:
  postgres: {}     # well-known defaults fill image/port/creds
  redis: {}
  opensearch: {}
env:
  DATABASE_URL:  postgresql://{{shared.postgres.url}}/{{db.main}}?schema=public
  REDIS_URL:     redis://{{shared.redis.host}}:{{shared.redis.port}}/{{shared.redis.slot}}
  OPENSEARCH_URL: http://{{shared.opensearch.host}}:{{shared.opensearch.port}}
```

## Named databases: `{{db.<name>}}`

Databases are a named map, referenced by name — never by position:

```yaml
databases:
  main: {}
  test: {}
env:
  DATABASE_URL: "postgresql://{{shared.postgres.url}}/{{db.main}}"
```

## Cross-service URLs: `{{<repo>.<service>.url}}`

Reference another repo's service by its alias and service name. The `.url`
form is **profile-aware** — an `environments:<profile>` override retargets it
to a remote host; on `local` it points at the dev-proxy. The `.path` form is
always the same-origin route (`/_pom_dev/<repo>/<service>`), so a frontend can
call the backend without CORS.

```yaml
env:
  COMMUNICATION_SERVICE_URL: '{{comm.api.url}}'   # api service of the `comm` repo
  NEXT_PUBLIC_API_URL: '{{client.portal.url}}/_pom_dev/api/api'
```

## Switchable variables: `{{var:NAME}}`

A service can also publish a named variable with
[`exposes`](../guide/services#publishing-switching-urls); consumers use
`{{var:NAME}}` and an `environments:<profile>` entry overrides it. Prefer the
dot service-ref above for a plain cross-service URL; use `{{var:}}` for
free/published variables.

```yaml
services:
  web:
    cmd: bundle exec puma -p $PORT
    port: true
    exposes: API_URL          # API_URL = this service's local URL
env:
  API_HOST: "{{var:API_URL}}"
  API_WS:   "{{var:API_URL | ws}}"   # http→ws / https→wss
environments:
  staging:
    API_URL: "https://api.acme.dev"  # override under the staging profile
```

## Where they work

- `repos.<repo>.env` (flat, file-keyed, or `"*"` shared base)
- `repos.<repo>.databases`
- `repos.<repo>.services.<svc>.env`
- `shared_services.<svc>.environment`
- `environments.<profile>.*` (variable override values)

Anywhere else, templates are left untouched.

## Resolving example

Given a workspace on branch `feat/login` and `session: myproject`:

```yaml
databases:
  main: {}
env:
  DATABASE_URL: "postgresql://{{shared.postgres.url}}/{{db.main}}"
  REDIS_URL: "redis://{{shared.redis.host}}:{{shared.redis.port}}/{{shared.redis.slot}}"
```

becomes

```
DATABASE_URL=postgresql://postgres:postgres@localhost:44800/myproject_feat_login
REDIS_URL=redis://localhost:44801/3
```

## Legacy forms

The colon forms still resolve for back-compat but have dot replacements —
prefer the dot form:

| Legacy | Write instead |
| --- | --- |
| `{{conn:name}}` | `{{shared.name.url}}` |
| `{{host:name}}` / `{{port:name}}` | `{{shared.name.host}}` / `{{shared.name.port}}` |
| `{{db:name}}` | `{{db.name}}` |
| `{{slot:name}}` | `{{slot.name}}` |
| `{{branch_safe}}` / `{{branch_host}}` | `{{branch.safe}}` / `{{branch.host}}` |

Removed entirely in v2: `{{url:}}` / `{{ws:}}` string templates, positional
`{{db:N}}`, `global_services`, the per-repo `env_switch` bool.
