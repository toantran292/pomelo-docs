# Webhooks & OAuth callbacks

Testing a feature across several branches at once? Each workspace runs its own
copy of a service on its own port — but an external provider (Stripe, Nylas, a
Git host) only knows **one** URL. Pomelo's **webhook relay** bridges that: a
single public port receives inbound requests and routes them to the right
workspace(s).

## Vendor-neutral by design

The relay is just an HTTP server on a local port (defaults to the dashboard
port **+ 1**, e.g. `8766`). It doesn't know about any provider — point **any**
tunnel at it:

| Provider | Command | Stable URL? |
| --- | --- | --- |
| **Tailscale Funnel** | `tailscale funnel 8766` | ✅ `<machine>.<tailnet>.ts.net` |
| ngrok | `ngrok http 8766 --domain=you.ngrok.app` | ✅ (static domain) |
| cloudflared (named) | `cloudflared tunnel run pom` | ✅ your domain |
| VPS + Caddy/nginx | `reverse_proxy → :8766` | ✅ |

The only requirement is a **stable public URL** — whatever your provider gives.
There's no lock-in: switching providers just changes the tunnel command.

## Three routing modes

### 1. `routes` — fan-out (webhooks)

A webhook event (e.g. a Stripe charge) is safe to deliver to **every**
workspace running the service — each has its own database, so they process
independently.

```yaml
webhook:
  routes:
    "/api": api            # → the "api" repo's service, in every workspace
    "/hooks": web/server   # → a specific service: <alias>/<svc>
```

The relay matches the longest path prefix, **strips** it (so `/api/hooks/x` →
the app sees `/hooks/x`), forwards the raw request (headers incl. signature +
body) to each listening workspace, and **ACKs 200 immediately** — one slow
branch never makes the provider retry.

### 2. `state_routes` — OAuth callbacks (recommended)

An OAuth callback (`…/auth/callback?code=…`) **can't** be fanned out: the code
is single-use and must return to the workspace that started the flow. And
providers require the redirect URI to be **allowlisted exactly** (no
wildcards) — so a per-branch URL means adding every branch to the provider,
forever.

Instead, allowlist **one** URL and route by the OAuth `state` param (which the
provider echoes back). The workspace prefixes `state` with `pom~<branch>~`:

```yaml
webhook:
  state_routes:
    "/portal/v1/nylas/auth/callback": portal/api
```

The app builds `state` from the [`{{branch_host}}`](../reference/templates)
template so each workspace identifies itself:

```yaml
env:
  NYLAS_CALLBACK_URI: "https://portal.example.com/portal/v1/nylas/auth/callback"  # the ONE URL
  POM_OAUTH_STATE_PREFIX: "pom~{{branch_host}}~"   # app appends its own CSRF
```

Flow: workspace `crm-855` starts OAuth with `state=pom~crm-855~<csrf>`; the
provider redirects to the single allowlisted URL; the relay reads `state`,
forwards **only** to `crm-855`, and returns its real response (the redirect).
New branches need **no** provider change.

### 3. `host_routes` — per-workspace subdomain

If a service is reachable at a wildcard hostname (not gated by OAuth
allowlisting), route by Host:

```yaml
webhook:
  host_routes:
    "portal.example.com": portal/api   # <branch>.portal.example.com → that ONE workspace
```

with a wildcard `*.portal.example.com` at the tunnel and per-workspace URLs via
`{{branch_host}}`. For OAuth providers that demand exact redirect URIs, prefer
`state_routes`.

## How the relay picks the workspace

- `routes`: **all** workspaces running the service.
- `state_routes`: the one named in `?state=pom~<branch>~…`.
- `host_routes`: the one named in the `Host` header's `<branch>.<suffix>`.

`host_routes` and `state_routes` proxy **synchronously** and return the app's
real response; `routes` acknowledges and fans out in the background. All run
server-side (work under the [daemon](./install#run-at-login-daemon)), bound to
loopback. See the [config reference](../reference/config#webhook-fan-out).
