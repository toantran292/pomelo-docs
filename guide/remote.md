# Remote & failover

Run Pomelo on one machine (a homelab box, a VPS) and drive it from your
laptop. The **server** owns everything — worktrees, services, databases,
ports, agents. The **client** is just a window into it. Reach the server
over your network; **Tailscale** is the easy way to a stable private address.

::: tip One server per project
The client holds no state. Keep one machine as the server for a given project
(don't run two dashboards for it at once) — your work lives there and in git.
:::

## Server: run it always

Install Pomelo as a background service so the dashboard is always up and keeps
itself updated:

```bash
pom daemon install     # launchd (macOS) / systemd user service (Linux)
pom daemon status
pom web url            # prints the URL + access token (for pairing)
```

See [Run at login](./install#run-at-login-daemon) for details.

## Client: pair and open

```bash
pom connect my-server --token XXXX     # or paste the URL from `pom web url`
pom                                    # opens the remote dashboard, locally
pom disconnect                         # unpair
```

Bare `pom` (while paired) runs a local reverse proxy to the server:

- The dashboard is served at **`127.0.0.1`**, so the browser's clipboard works
  and there's no token in the URL — the proxy injects the token and keeps the
  same-origin check happy.
- It **forwards each workspace's service ports** to the same ports locally, so
  an app's baked `http://127.0.0.1:<port>` URLs resolve to the real service on
  the server. New services are picked up automatically.
- Terminals stream through over WebSocket.

### Over SSH — when only `:22` is open

If your VPN reaches the server but the dashboard port is firewalled (common on
a Tailscale subnet router that only forwards `:22`), pair over SSH instead — no
exposed port, no token:

```bash
pom connect ssh://user@my-server            # tunnels the dashboard over SSH
pom connect ssh://my-host -i ~/.ssh/id_ed25519   # explicit identity
pom                                         # opens it locally on 127.0.0.1:8765
```

Bare `pom` supervises an SSH control-master (auto-reconnect, keepalive) that
forwards the dashboard, the webhook listener, the **dev-proxy** (so
`*.<branch>.localhost` domains resolve locally), and each workspace's service
ports. Both ends of the tunnel are loopback, so the server's same-origin check
passes with **no token**.

::: tip Connect via an ssh config alias
`pom connect ssh://my-host` where `my-host` is a `Host` block in
`~/.ssh/config` (with `HostName` + `IdentityFile`) is the smoothest — SSH auth
and the **Editor** button both resolve through it.
:::

The **Editor** button works in this mode: it opens the remote worktree in
**your local editor over ssh** — `zed ssh://my-host/<path>`, or VS Code / Cursor
via Remote-SSH (`--remote ssh-remote+my-host`), preferring the project's
`ui.editor`. (In plain HTTP mode the server is the one that launches the editor.)

`pom server <command>` runs directly over ssh in this mode.

## Run server commands from the client

```bash
pom server workspace list
pom server start api
pom server ws create FEAT-1 add-login
```

`pom server <command>` runs a pom command **on the server** (in its project)
and prints the output locally — no SSH needed. It's audited server-side
(`exec-audit.log`).

## Failover: take over when the server is far or down

The server continuously pushes work to `origin` when
[`sync.auto_push`](../reference/config#sync) is on — new commits plus a
snapshot of uncommitted work (`refs/pom-wip/<branch>`). So another machine can
pick up with at most a few minutes' loss.

```bash
# before leaving a machine — push everything:
pom handback

# on the machine you want to work on (e.g. laptop, server unreachable):
pom takeover     # fetch + fast-forward each worktree, restore the WIP snapshot
                 # onto a clean tree, and unpair so bare `pom` serves locally
pom              # local dashboard
```

`takeover` never clobbers a dirty tree. Live processes and per-branch DBs don't
fail over — services just restart locally; code is what's protected.

## Reclaim the laptop

When you go back to driving the server and want the laptop light again:

```bash
pom release                 # stop local services + remove shared containers (RAM)
pom release --disk          # also drop docker volumes (disk)
pom release --worktrees     # also delete branch workspaces (keeps main)
```

## Migrate a project to a server

```bash
pom relocate my-server      # SSH preflight + copy-paste migration plan
```

It checks the server (pom/git/zsh/docker/claude/gh, gh auth, and whether
the server can clone your repos) and prints what's missing. It **never copies
secrets** — GitHub auth + an SSH key for git, and Claude auth + your
`~/.claude` skills, are per-machine and must be set up on the server; relocate
just tells you which. Movable bits (code via git, `.env`, archives) come with
copy-paste commands.

## What it needs

Just network reachability to the server and a stable address — Tailscale is
ideal (encrypted, stable `*.ts.net` names, works anywhere). Nothing is
Cloudflare- or vendor-specific.
