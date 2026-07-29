# Template variables

The values in `env:`, `databases:`, `services.<name>.cmd`, and a handful
of other fields are templates. Pomelo resolves them when materializing
each workspace, substituting values from the network state, shared
services, and the workspace's branch.

Every reference is **validated at load** — a typo, a renamed alias, or a
missing database name fails loudly with a clear error instead of breaking
silently at runtime.

## Catalog

| Template | Resolves to | Example |
| --- | --- | --- |
| `{{var:NAME}}` | A switchable variable — local URL of the publishing service, or its override under the active profile | `http://localhost:40012` |
| `{{var:NAME \| ws}}` | Same value, scheme converted `http→ws` / `https→wss` | `ws://localhost:40012` |
| `{{host:NAME}}` | Shared service host (always `localhost` on the host machine) | `localhost` |
| `{{port:NAME}}` | Dynamic port for a shared service, or a repo service port | `44800` |
| `{{conn:NAME}}` | `user:pass@host:port` from shared service creds | `postgres:postgres@localhost:44800` |
| `{{db:NAME}}` | Named database (session-prefixed, branch-resolved) | `myproject_feat_login` |
| `{{slot:NAME}}` | Allocated slot index for capacity-limited services | `3` |
| `{{bind_ip}}` | Always `127.0.0.1` | `127.0.0.1` |
| `{{branch}}` | Raw workspace branch name | `feat/login` |
| `{{branch_safe}}` | Branch with `/`→`_`, `-`→`_` (safe for DB names) | `feat_login` |

## Variables: `{{var:NAME}}`

`{{var:NAME}}` is the **only** environment-switching template. A variable
is published by a service with [`exposes`](../guide/services#publishing-switching-urls):

```yaml
services:
  web:
    cmd: bundle exec puma -p $PORT
    port: true
    exposes: API_URL          # API_URL = this service's local URL
```

Consumers reference it without ever naming the alias:

```yaml
env:
  API_HOST: "{{var:API_URL}}"
  API_WS:   "{{var:API_URL | ws}}"
```

Because the binding lives at the producing service, renaming the alias,
repo, or service never breaks consumers. Profiles override the value:

```yaml
environments:
  staging:
    API_URL: "https://api.acme.dev"
```

When a service's active profile is `staging`, `{{var:API_URL}}` resolves
to the remote URL; on `local` it resolves to `http://localhost:<port>`.

A variable with no publishing service (a free variable) can be declared
directly under a profile — give it a `local:` value for the default.

## Named databases: `{{db:NAME}}`

Databases are a named map, referenced by name — never by position:

```yaml
databases:
  dev:  "{{branch_safe}}"
  test: "{{branch_safe}}_test"
env:
  DATABASE_URL: "postgres://{{conn:postgres}}/{{db:dev}}"
```

## Where they work

- `repos.<repo>.env` (flat, file-keyed, or `"*"` shared base)
- `repos.<repo>.databases`
- `repos.<repo>.services.<svc>.env`
- `shared_services.<svc>.environment` (via `{{host}}` / `{{port}}`)
- `environments.<profile>.*` (variable override values)

Anywhere else, templates are left untouched.

## Resolving example

Given a workspace on branch `feat/login` and `session: myproject`:

```yaml
databases:
  dev: "{{branch_safe}}"
env:
  DATABASE_URL: "postgres://{{conn:postgres}}/{{db:dev}}"
  REDIS_URL: "redis://{{host:redis}}:{{port:redis}}/{{slot:redis}}"
  API_HOST: "{{var:API_URL}}"
```

becomes (active profile `local`)

```
DATABASE_URL=postgres://postgres:postgres@localhost:44800/myproject_feat_login
REDIS_URL=redis://localhost:44801/3
API_HOST=http://localhost:40012
```

## Migrating from the old templates

| Old | New |
| --- | --- |
| `{{url:api}}` (switchable) | publish `exposes: API_URL`, use `{{var:API_URL}}` |
| `{{url:repo/svc}}` | publish `exposes: SOME_URL` on that service, use `{{var:SOME_URL}}` |
| `{{ws:api}}` | `{{var:API_URL \| ws}}` |
| `{{db:0}}` (positional) | name the database, use `{{db:name}}` |
| `environments.staging.api: <url>` | `environments.staging.API_URL: <url>` (key is the variable name) |
