# Workspace lifecycle

A workspace is one isolated copy of your project, anchored to a git
branch. Each lives in its own `workspace--<branch>/` folder containing
a git worktree per repo, with its own ports, env, and databases.

## Create

From the web UI: use the create-workspace control, enter a Jira ticket
and/or a description (they form the branch), and pick the repos.

### Create & assign to agent

Leave **“Start Claude on this ticket after creating”** ticked (the default)
and the button becomes **Create & assign**: once the workspace is built —
worktrees, per-branch databases, ports, env all provisioned — Pomelo opens
a Claude session in it that's **already primed with the ticket** (its
summary and description are injected into the session's context) and wired
to the [MCP tools](#agent-tools-mcp). You review and say "go" — the agent
starts with full context and can inspect ports, run migrations/tests
against the real stack, and open a PR. Any Claude session in a
ticket-prefixed workspace gets this ticket context automatically, button or
not.

From the CLI:

```bash
pom workspace create <combo> <branch>
```

Behind the scenes a 7-stage pipeline runs (validate → provision → infra
→ source → configure → setup → network). Stages 4–6 fan out one
goroutine per repo. The web dashboard streams progress live; the CLI
prints it event-by-event.

To extend an existing workspace, use the same control on the workspace
row to add or remove individual repos.

## List

```bash
pom workspace list
```

Each row shows the branch, included repos, current running services
count, and the workspace port block.

## Delete

From the web UI: use the delete control on a workspace row, then confirm.

From the CLI:

```bash
pom workspace delete <branch>
```

A 5-stage pipeline tears it down: pre-delete hooks → stop services →
drop databases → remove worktrees → release port block.

When you delete from the web UI, the confirm dialog offers **“Archive to
Markdown first”** (see below) so a finished ticket's context is captured
before its worktree is gone.

## Archive

When a ticket is done and you're about to delete its workspace, you often
still want the *story* — what was built, which bugs came up, how they were
fixed — for later reference. **Archiving** captures that as a Markdown
document.

It gathers the ticket (from your Jira config, if set), the pull requests,
the commits and diff stat, and the workspace's Claude Code session, then
asks **your own `claude` CLI** to write a retrospective (overview, bugs &
fixes with root causes, key decisions, PRs, follow-ups) in the same
language the work was discussed in.

Archives are saved per session under
`~/.local/state/pom/archives/<session>/<branch>.md`, so they **survive
deleting the workspace** and stay retrievable long after.

From the web UI: a workspace's **⋯** menu → **Archive to Markdown**, or tick
the box in the delete dialog. Browse and read past archives from the
**⤓** button in the sidebar footer.

From the CLI:

```bash
pom archive <branch>          # generate (invokes your claude CLI)
pom archive list              # list this session's archives
pom archive show <branch>     # print one
pom archive path              # print the archive directory
```

### Auto-archive on PR merge

Turn it on and you never have to remember: once a workspace's pull
request **merges** (and no PR on that workspace is still open), Pomelo
archives it automatically. Detection runs server-side in the PR watch
loop, so it fires **even with no browser open** — as long as `pom` (or the
[daemon](./install#run-at-login-daemon)) is running. Each branch archives
at most once.

Enable it in **Settings → Jira → Archive**, or in `pom.yml`:

```yaml
archive:
  auto_on_merge: true
```

It's **off by default**: generating an archive runs your `claude` CLI and
spends tokens, so Pomelo won't do it behind your back until you opt in.

### Recalling archives from a Claude session

You don't have to remember any of this while working. When Pomelo launches
a **Claude Code** window, it grants that session read access to this
session's archive directory (`--add-dir`) and tells Claude the path plus
the `pom archive list` / `pom archive show <branch>` commands. So mid-
task you can just ask *"check the archive for `feat-x` — how did we fix
that bug?"* and Claude reads or greps the past retrospectives directly. The
grant is scoped to the current session's archives only.

::: tip Uses your Claude plan
Generating an archive runs `claude -p` on your machine, so it consumes
tokens on your own Claude subscription/API. The Claude session transcript
is bounded before it's sent, and if `claude` isn't available the collected
context is still saved verbatim — you never end up with nothing.
:::

## Agent tools (MCP)

A Claude Code session running in a workspace can't see its own environment
by default — which port its dev server got, which database to migrate,
whether a service is even up. Pomelo closes that gap: when it launches a
Claude window it registers an **MCP server** scoped to that workspace, so
the agent can inspect and act on the *real running stack* it lives in.

The tools:

| Tool | What the agent can do |
| --- | --- |
| `workspace_info` / `services` / `ports` | See the branch, its repos, and each service's running state + allocated port |
| `databases` | Get ready-to-use per-branch Postgres connection strings |
| `service_start` / `service_stop` / `service_restart` | Bring services up/down (ports are pre-flighted — a started service binds the port Pomelo reports) |
| `service_logs` | Read a service's recent output (e.g. to spot a crash) |
| `commands` | List the project's **pre-written** `setup` steps and `shortcuts` (description → command, preset-resolved) plus its package manager (`local_pm`) — so the agent runs *your* canonical install/migrate/lint/test commands instead of guessing |
| `run_shortcut` | Run one of those shortcuts by description, in the repo's resolved env |
| `run_in_env` | Run an arbitrary command in a worktree with the resolved env — migrations, tests, seeds — and read the result, verifying against the actual stack (also honors `local_pm`, so a hand-written `npm install` becomes `pnpm install`) |
| `resolve_port_conflict` | Self-heal: move the workspace to a clean port region when something else grabbed a port |
| `config_get` / `config_validate` / `config_set` | Read and safely edit `pom.yml` — every write is schema-validated before it lands, and new services get ports automatically |
| `config_files` / `config_file_get` / `config_file_set` | Edit a **split** config: list and edit the individual `pom.d/**` fragments, validated in the full merged context |
| `migrate_config` | Migrate a legacy `tncli.yml` to `pom.yml` |

So mid-task you can say *"the migration failed — check the DB and rerun
it"* or *"add a worker service and start it"*, and the agent uses these
tools instead of guessing ports or hand-editing config. It reads your
`shortcuts`/`setup` first, so an agent runs your exact `db:migrate` recipe
(or `pnpm install`, honoring `local_pm`) rather than inventing one. Nothing
leaves your machine.

`pom mcp` is the underlying command; it's wired up automatically (registered
as the `pom` MCP server), so you rarely run it yourself. It's **portless**:
it finds your project config by walking up from the current directory and
builds the `/api` handler in-process — no running dashboard and no port
needed.

### Multi-repo workspace map

A workspace with more than one repo is a *virtual monorepo*: the workspace
root is the parent of every repo's worktree, and Claude runs rooted there so
it can read across all of them. To keep that cheap, Pomelo writes a concise
`CLAUDE.md` **at the workspace root** — generated from your config — that lists
each repo (alias, folder, services, exposed variables, databases, environments)
and the dev-proxy topology, plus the working rules *"read across repos freely,
but scope each change to one repo / one PR"* and *"only open the repos this task
touches."* This is the org-level layer of Claude Code's layered-`CLAUDE.md`
pattern; each repo keeps its own `CLAUDE.md` for repo-specific conventions.

It's facts-only (no invented descriptions), regenerated on every Claude launch
so it tracks your config, written **only** when a workspace has more than one
repo, and never overwrites a hand-written root `CLAUDE.md` — Pomelo only
rewrites the file it generated (tagged with a `pom:workspace-map` marker).

### Setup assistant

The dashboard's **Settings → Setup assistant** button launches a *dedicated*
Claude — separate from any workspace agent — whose only job is to get your
project running: it reads the real state over these MCP tools (ports, DBs,
service logs, config), diagnoses what's broken or misconfigured, and fixes
it by editing the right `pom.d` fragment (validated) or running the
project's own setup steps. You watch in the chat view and reload to apply.

## Recovery

Workspace metadata lives entirely on disk (`.tncli/network.json` per
project, plus the `workspace--<branch>/` folders themselves) — so
`pom` can be killed and restarted without losing state. If you
clobber the folder by hand, `pom workspace list` will refuse to
re-introduce stale port blocks.

## Tips

- The dashboard auto-collapses workspaces with zero running services so
  the tree stays scannable when you have many branches active. Expand a
  row to reopen it; the choice persists.
- For a one-off check (e.g. before a PR) you don't need a workspace at
  all — just create one ad-hoc and `pom workspace delete` when done.
