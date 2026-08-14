# CLI commands

`pom` is a single binary. With no args it launches the **web
companion** — an HTTP + WebSocket server that serves a browser UI and
mirrors your tmux panes with xterm.js. Everything else is a subcommand.

```bash
Pomelo                          # launch the web companion (default)
pom web --host 0.0.0.0 --port 8765   # web companion with explicit bind
```

By default the server binds `0.0.0.0:8765`, so it's reachable from other
devices on your LAN. Use `--host 127.0.0.1` to keep it local-only.

## Project lifecycle

```bash
pom init [name]              # scaffold a project from the git repo you're in
pom init --claude            # then let claude tailor pom.yml with you (interactive)
pom setup                    # one-time: global gitignore
pom doctor                   # check tools, services & config; point at fixes
pom update                   # download + install the latest release
pom update --rollback        # restore the previous binary (undo last update)
```

`setup` runs from anywhere (no project needed) and needs **no `sudo`** — ports
are allocated dynamically on `127.0.0.1`, so there's no loopback alias to
provision. Every command runs unprivileged.

## Ports

```bash
pom ports                    # live port registry: each service's port + state
pom ports --watch            # refresh in place (watch ports get claimed/freed)
```

Each service gets a **random free port** (10000–65535 on `127.0.0.1`), reserved
atomically and sticky while it runs; when it stops the port is freed. You never
address services by port anyway — the [dev proxy](../reference/config#dev-proxy)
serves a stable domain and resolves the current port for you. `pom ports` shows
each lease and where it is in its lifecycle (`assigned` → `starting` →
`running`).

## Workspaces

```bash
pom workspace create <combo> <branch>   # alias: pom ws create …
pom workspace delete <branch>
pom workspace list
```

`workspace` has the short alias **`ws`** (e.g. `pom ws list`).

See [Workspace lifecycle](../guide/workspace).

## Services

```bash
pom start  <service|combo>
pom stop  [service|combo]    # no arg → stop everything
pom restart <service|combo>
pom status                   # running services with PIDs
pom logs <service>           # recent output snapshot
pom attach [service]         # attach tmux session/window
```

See [Services](../guide/services).

## Databases

```bash
pom db list
pom db reset <branch>        # drop + recreate all DBs for a workspace
pom db clean                 # remove orphan DBs (with confirmation)
pom db clean --dry-run       # preview without acting
```

See [Databases](../guide/databases).

## Web companion

```bash
pom                            # launch the web companion (default)
pom web [--host H] [--port P]  # explicit bind (default 0.0.0.0:8765)
```

The web companion serves a browser dashboard: manage services, watch
live logs, and shell into any tmux pane via xterm.js. It attaches to the
service tmux session over WebSocket, so state survives closing the
browser tab.

## Background service (daemon)

```bash
pom daemon install [--port P]  # install + start the login service
pom daemon status              # installed / running / serving
pom daemon logs                # recent daemon output
pom daemon restart             # bounce the service (apply a manual `pom update` now)
pom daemon uninstall           # stop + remove it
pom daemon run [--host H] [--port P]  # foreground worker (run by the service)
```

Runs the dashboard at login and auto-updates itself (checks `pomelo-releases`
every 6h, updates in place and relaunches on the new binary). launchd on macOS,
systemd user service on Linux. To apply an update immediately instead of
waiting: `pom update` then `pom daemon restart`. See
[Run at login](../guide/install#run-at-login-daemon).

## Remote (thin client)

```bash
pom connect <host|url> [--token T]  # pair with a remote pom server
pom                                 # (when paired) open the remote dashboard locally
pom server <command...>             # run a pom command on the paired server
pom disconnect                      # unpair
pom takeover                        # make this machine primary (pull latest + go local)
pom handback                        # push all work so another machine can take over
pom release [--disk] [--worktrees]  # free local footprint (services/containers/disk)
pom relocate <ssh-host>             # preflight a server + plan migrating this project to it
```

Pairs this machine with a remote server; bare `pom` then proxies its dashboard
to `127.0.0.1` and forwards service ports. See
[Connect from another machine](../guide/install#connect-from-another-machine-thin-client).

## Run & inspect

```bash
pom run <service> <cmd...>   # run a one-off command in a service's env
pom disk                     # report disk usage of worktrees + volumes
```

## Misc

```bash
pom version
pom completion <shell>       # shell completion: bash | zsh | fish
```
