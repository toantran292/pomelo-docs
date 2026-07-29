# FAQ & troubleshooting

Answers to the questions that come up most — especially the non-obvious
ones. If something here is out of date, please open an issue.

## What if a dependency is missing?

The dashboard runs a preflight check and shows a banner under the topbar:

- **Required tool missing** (`git`, `tmux`, `zsh`) → a red banner — Pomelo
  can't work without them.
- **Optional tool missing** (`gh`, `claude`, `docker`) → a dismissible
  warning naming the feature it gates (PR status, agent tabs, shared
  services), so those features stay off until you install it.

Both link to the install steps above. See [Dependencies](#dependencies).

## The dashboard says "access token required"

That only happens over the **LAN** — on localhost the dashboard needs no
token. Access from another device is gated by a per-install token so no
one else on your network can reach your terminals. The token rides in the
LAN launch URL and becomes a cookie on first visit; if a LAN device lands
on the 401 page (new browser, cleared cookies, bookmarked bare URL), run:

```bash
pom web url    # prints the localhost URL + the tokened LAN URL
```

and open the LAN URL. The token lives in `~/.local/state/pom/web_token`;
deleting the file rotates it on next launch. (Malicious websites can't
reach even localhost — cross-origin requests are rejected regardless.)

## A service starts fine in my terminal but fails under Pomelo

Services run via `zsh -ic` (an **interactive** shell) so your `~/.zshrc`
is sourced and version managers (nvm, rvm, asdf) resolve the right
toolchain. If a service still can't find a binary, make sure the tool is
set up in your `.zshrc` (not only `.zprofile`/`.bash_profile`), or put the
setup in the service's `pre_start` hook. `pre_start` runs after the `cd`
into the worktree and before the command.

## PR badges / checks don't show up

- Run `gh auth login` once — PR data comes from the GitHub CLI's token.
- The repo needs a GitHub `origin` remote. **SSH host aliases work**
  (e.g. `git@myalias:owner/repo` from your `~/.ssh/config`) — Pomelo reads
  `owner/repo` from any URL form.
- A workspace shows **no PR pill** when its branch simply has no open PR.
  It's fetched by exact branch, so it won't miss one that exists.

## Where is "Delete workspace"?

Right-click a workspace card in the sidebar → **Delete workspace…**. It's
offered on branch workspaces only — **main** is the pinned project home
and can't be deleted (it has **Pull latest** instead). Right-click also
has **Add repos…** and **Reset databases…**.

## How do I add a repo to the project?

Right-click the **main** workspace → **Add repo (clone from URL)…**, paste
a git URL (SSH or HTTPS; aliases work). Pomelo clones it into the main
workspace, registers it in `pom.yml`, and reloads — no restart. On a
**branch** workspace, right-click → **Add repos…** instead adds worktrees
for repos already declared in the project.

## How do I delete a session?

Open the session switcher (top-left project chip) and **right-click a
session** → **Remove from list** (unregister, keep the files) or **Delete
session + files…** (also removes its directory from disk). You can't
delete the **active** session — switch to another first.

## Copy from a terminal doesn't work (or copies the wrong thing)

- Select with click-drag, then **⌘C** (macOS) or **Ctrl+Shift+C**
  (Linux/Windows). Plain **Ctrl+C** is left for the app (interrupt /
  Claude's cancel).
- Over a **LAN IP** (`http://192.168.x.x:…`) the browser blocks the
  Clipboard API; Pomelo falls back automatically, but for full clipboard
  access open the dashboard on **`localhost`**.
- Right-click → **Copy** works too, and keeps your selection.

## Selecting inside a fullscreen TUI (Claude, htop, …)

A fullscreen TUI with mouse reporting owns the mouse — clicks, drags and
the wheel go to the app, exactly as in a native terminal. To make a text
selection anyway, hold **⌥ (Option/Alt) while dragging** — that forces a
real terminal selection the app can't see. If the selection vanishes as
the app repaints, it's still preserved for Copy/⌘C.

## Two services grabbed the same port / ports keep changing

They shouldn't — each workspace leases a fixed 100-port block and each
service a stable offset, persisted in `.tncli/network.json`. Ports are
**reproducible** across restarts. See
[Architecture › Port management](./architecture#port-management).

## I deleted a workspace folder by hand and now create fails

Deleting a `workspace--…/<repo>` folder with `rm -rf` (instead of the
Delete action) leaves git with a stale worktree registration, so creating
that branch again fails with *"'…' is already used by worktree at …"*.
Pomelo now **prunes stale registrations automatically** before adding a
worktree, so a retry usually just works. If you're on an older build or a
folder is only half-removed, clear it manually from any worktree of that
repo:

```bash
cd ~/…/workspace--main/<repo>     # any worktree of the same repo
git worktree prune                # drop entries whose folder is gone
git worktree list                 # confirm the stale one disappeared
# still stuck? force it, then prune:
git worktree remove --force <the-path-in-the-error>
git worktree prune
```

Prefer the **Delete workspace** action (or `pom workspace delete`) — it
removes worktrees, databases and port leases together, so nothing goes
stale.

## Shared services (Postgres/Redis/…) aren't running

They need **docker**. You don't have to start them manually — starting a
repo service first brings its shared dependencies up. Check
`docker ps`, and that Docker is running.

## When are `.env` files (re)written?

On three events, and only then: **workspace create**, **service start**
(picks up config edits before launch), and an **env-profile switch**. So
edit config, then start — the env reflects it.

## Can I run Pomelo from any directory?

Yes. Bare `pom` opens the dashboard; it finds `pom.yml` by walking up
from the current directory, and otherwise falls back to your current
session. Creating a new session (sidebar) clones each repo from its
**git URL** (SSH or HTTPS). A clone doesn't bring git-ignored files like
`.env` — add them right in the create dialog's **Env files** section
(repeatable `path` + content rows; a monorepo can have several at
different sub-paths), or add them to the main workspace afterward
**before creating any new workspace** (new workspaces branch from
what's there).

## How do I attach to a pane from my own terminal?

Right-click a terminal → **Copy tmux attach command**, then paste it in a
terminal. The tmux service session (`tncli_<project>`) survives closing
the browser, so you can reconnect any time.
