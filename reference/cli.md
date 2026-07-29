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
pom setup                    # one-time: /etc/hosts + global gitignore
pom migrate                  # migrate from older state layouts
pom update                   # download + install the latest release
```

`setup` is the only command that asks for `sudo` (to edit
`/etc/hosts`). Everything else runs unprivileged.

## Workspaces

```bash
pom workspace create <combo> <branch>
pom workspace delete <branch>
pom workspace list
```

See [Workspace lifecycle](../guide/workspace).

## Services

```bash
pom start  <service|combo>
pom stop  [service|combo]    # no arg → stop everything
pom restart <service|combo>
pom status                   # running services with PIDs
pom list                     # services + workspaces summary
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
Pomelo                          # launch the web companion (default)
pom web [--host H] [--port P]  # explicit bind (default 0.0.0.0:8765)
```

The web companion serves a browser dashboard: manage services, watch
live logs, and shell into any tmux pane via xterm.js. It attaches to the
service tmux session over WebSocket, so state survives closing the
browser tab.

## Run & inspect

```bash
pom run <service> <cmd...>   # run a one-off command in a service's env
pom disk                     # report disk usage of worktrees + volumes
pom agent                    # AI code-agent integration
```

## Misc

```bash
pom version
pom completion <shell>       # shell completion: bash | zsh | fish
```
