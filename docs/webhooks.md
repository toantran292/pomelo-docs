# Webhooks & OAuth callbacks

Testing a feature across several branches at once? Each workspace runs its
own copy of a service on its own port — but an external provider (Stripe,
a Git host, an OAuth vendor) only knows **one** URL. Pomelo's **webhook
relay** bridges that: a single local port receives inbound requests and
routes them to the right workspace(s). Point any tunnel (Tailscale Funnel,
ngrok, cloudflared, a reverse proxy) at that port — the relay is
vendor-neutral.

The relay runs inside the app, bound to loopback, and follows the active
session. It defaults to the dev-proxy control port +1 (set `listen_port`
to pin it).

## 1. `routes` — fan-out (webhooks)

A webhook event (e.g. a Stripe charge) is safe to deliver to **every**
workspace running the service — each has its own database, so they process
independently.

```yaml
webhook:
  routes:
    "/api": api            # → the "api" repo's service, in every workspace
    "/hooks": web/server   # → a specific service: <alias>/<svc>
```

The relay matches the longest path prefix, **strips** it (so `/api/hooks/x`
→ the app sees `/hooks/x`), forwards the raw request (headers incl.
signature + body) to each listening workspace, and **ACKs 200
immediately** — one slow branch never makes the provider retry. A route
target is a repo **alias** (uses that repo's sole service) or `alias/svc`
to pick one.

## 2. `state_routes` — OAuth callbacks (recommended)

An OAuth callback (`…/auth/callback?code=…`) **can't** be fanned out: the
code is single-use and must return to the workspace that started the flow.
And providers require the redirect URI to be **allowlisted exactly** (no
wildcards) — so a per-branch URL means adding every branch to the provider,
forever.

Instead, allowlist **one** URL and route by the OAuth `state` param (which
the provider echoes back). The workspace prefixes `state` with
`pom~<branch>~`:

```yaml
webhook:
  state_routes:
    "/api/v1/oauth/callback": api
```

The app builds `state` from the [`{{branch.host}}`](../reference/templates)
template so each workspace identifies itself:

```yaml
env:
  OAUTH_CALLBACK_URI: "https://app.example.com/api/v1/oauth/callback"  # the ONE URL
  POM_OAUTH_STATE_PREFIX: "pom~{{branch.host}}~"   # app appends its own CSRF
```

Flow: workspace `feat-login` starts OAuth with `state=pom~feat-login~<csrf>`;
the provider redirects to the single allowlisted URL; the relay reads
`state`, forwards **only** to `feat-login`, and returns its real response
(the redirect). New branches need **no** provider change.

## 3. `host_routes` — per-workspace subdomain

If a service is reachable at a wildcard hostname (not gated by OAuth
allowlisting), route by Host:

```yaml
webhook:
  host_routes:
    "app.example.com": api   # <branch>.app.example.com → that ONE workspace
```

with a wildcard `*.app.example.com` at the tunnel and per-workspace URLs
via `{{branch.host}}`. For OAuth providers that demand exact redirect URIs,
prefer `state_routes`.

## How the relay picks the workspace

- `routes`: **all** workspaces running the service (fan-out in the
  background after an immediate ACK).
- `state_routes`: the one named in `?state=pom~<branch>~…` (proxied
  synchronously, returns the app's real response).
- `host_routes`: the one named in the `Host` header's `<branch>.<suffix>`
  (proxied synchronously).

See the [config reference](../reference/config#webhook-fan-out).
