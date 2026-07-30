# Install

Pomelo itself is a single binary, but it drives a few external tools. Make
sure the ones you need are installed before you start.

## Dependencies

| Tool | Required? | What Pomelo uses it for |
| :--- | :--- | :--- |
| **git** | Required | Per-workspace worktrees. |
| **tmux** | Required | Every service/agent runs in a tmux window (persistent logs, reconnect). |
| **zsh** | Required | Services launch via `zsh -ic` so your `.zshrc` (nvm/rvm/etc.) is loaded. |
| **gh** (GitHub CLI) | For PR features | Auth + the GraphQL calls that power PR status, checks, and mergeability. |
| **claude** (Claude Code) | For agent tabs | The built-in Claude Code agent each workspace exposes. |
| **docker** | For shared services | Postgres/Redis/MinIO/OpenSearch containers. Skip it if you run everything natively. |
| **Go 1.26+** | Building from source only | Not needed if you use a released binary. |

### macOS (Homebrew)

```bash
brew install git tmux gh          # zsh ships with macOS
brew install --cask docker        # optional — only for shared services
npm install -g @anthropic-ai/claude-code   # optional — the Claude agent
```

### Debian / Ubuntu

```bash
sudo apt update && sudo apt install -y git tmux zsh
# GitHub CLI (see cli.github.com for the signed-repo steps):
sudo apt install -y gh
# Docker (optional): https://docs.docker.com/engine/install/
# Claude Code (optional):
npm install -g @anthropic-ai/claude-code
```

### Arch

```bash
sudo pacman -S git tmux zsh github-cli
# docker (optional): sudo pacman -S docker
npm install -g @anthropic-ai/claude-code   # optional
```

Official install pages if a package is missing or you want another method:
[git](https://git-scm.com/downloads) ·
[tmux](https://github.com/tmux/tmux/wiki/Installing) ·
[GitHub CLI](https://cli.github.com/) ·
[Claude Code](https://code.claude.com/docs) ·
[Docker](https://docs.docker.com/get-docker/).

### After installing

Authenticate the GitHub CLI once so PR features work:

```bash
gh auth login
```

Verify the essentials are on your PATH:

```bash
git --version && tmux -V && gh --version && claude --version
```

::: tip Renamed from `tncli`
The tool is now **Pomelo**, command **`pom`**. Already on `tncli`? Just run
`tncli update` once — it lands you on Pomelo, adds the `pom` command (with a
`tncli` compat symlink), and future updates flow automatically. Your existing
`tncli.yml` keeps working; new projects can use `pom.yml`.
:::

## Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/toantran292/pomelo-releases/main/install.sh | bash
```

This downloads the latest binary for your OS/arch to `~/.local/bin/pom` and adds it to your PATH.

## Manual install

Download the binary for your platform from the [latest release](https://github.com/toantran292/pomelo-releases/releases/latest):

| OS / Arch          | File                              |
| ------------------ | --------------------------------- |
| macOS Apple Silicon| `pom-darwin-arm64.tar.gz`         |
| macOS Intel        | `pom-darwin-amd64.tar.gz`         |
| Linux x86_64       | `pom-linux-amd64.tar.gz`          |
| Linux ARM64        | `pom-linux-arm64.tar.gz`          |

```bash
tar xzf pom-darwin-arm64.tar.gz
mv pom-darwin-arm64 ~/.local/bin/pom
chmod +x ~/.local/bin/pom
```

## Verify

```bash
pom version
```

## Update

```bash
pom update
```

Fetches latest release and replaces the binary in place.

## Run at login (daemon)

Don't want to keep a terminal open? Install Pomelo as a background service
that starts at login and **keeps itself updated** — it periodically checks
for a new release, updates in place, and restarts on the new binary.

```bash
pom daemon install     # install + start the login service
pom daemon status      # installed / running / serving
pom daemon logs        # recent daemon output
pom daemon uninstall   # stop + remove it
```

On macOS this is a launchd agent (`~/Library/LaunchAgents/com.pomelo.daemon.plist`);
on Linux a systemd user service (`systemctl --user … pomelo`). The dashboard
comes up on `http://127.0.0.1:8765` (pass `--port` to `install` to change it),
serving your last-used session. `pom daemon run` is the foreground worker the
service launches — you rarely run it yourself.

::: tip Auto-update cadence
The daemon checks for updates a couple of minutes after starting, then every
few hours. When it finds a newer release it self-updates and the service
manager relaunches it — so a machine left running stays current on its own.
:::

## Run on a server / connect from another machine

Pomelo can run on one machine (homelab box, VPS) with your laptop as a thin
client — plus failover and migration. See **[Remote & failover](./remote)**.
