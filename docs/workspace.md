# Workspace lifecycle

A workspace is one isolated copy of your project, anchored to a git
branch. Each lives in its own `workspace--<branch>/` folder containing
a git worktree per repo, with its own ports, env, and databases.

## Create

In the app, use the **create-workspace** control in the sidebar: enter a
branch (or a Jira ticket + a short description, which form the branch) and
pick the repos to include. Pomelo builds the workspace — worktrees,
per-branch databases, ports, env — through a staged pipeline and streams
progress as it goes.

### Create & assign to a Claude agent

If you leave **"Start Claude on this ticket"** on, once the workspace is
built Pomelo opens a **Claude** session in it that's already primed with
the ticket (its summary and description) and wired to the
[MCP tools](#agent-tools-mcp). The agent starts with full context and can
inspect ports, run migrations/tests against the real stack, and open a PR.
Any Claude session in a ticket-prefixed workspace gets this ticket context
automatically.

To extend an existing workspace, use the same control to add or remove
individual repos.

## Seed from main

Set up the **main** workspace once (install deps, migrate + seed its DBs)
and new workspaces inherit that prepared state instead of rebuilding it —
`main` is the golden source.

- **Databases** — `seed_from_main: true` on a repo clones its databases
  from main's counterparts (`CREATE DATABASE … TEMPLATE`) in seconds, with
  main's sample data, rather than creating them empty and re-seeding.
- **node_modules** — a fresh worktree seeds `node_modules` from a
  hash-keyed store built off main's installed copy, materialized
  copy-on-write, so the install is a near-no-op.

See [Databases › Seed from main](./databases#seed-from-main).

## Switch

Select any workspace in the sidebar to switch to it. Each keeps its own
services, terminals, and Claude session; switching never restarts
anything. The app auto-collapses workspaces with zero running services so
the sidebar stays scannable when many branches are active.

## Delete

Use the **delete** control on a workspace (right-click → **Delete
workspace…**). A staged pipeline tears it down: pre-delete hooks → stop
services → drop databases → remove worktrees → release ports. The
**main** workspace is the pinned project home and can't be deleted.

The confirm dialog offers **"Archive to Markdown first"** (see below) so a
finished ticket's context is captured before its worktree is gone.

## Archive

When a ticket is done and you're about to delete its workspace, you often
still want the *story* — what was built, which bugs came up, how they were
fixed. **Archiving** captures that as a Markdown document.

It gathers the ticket (from your Jira config, if set), the pull requests,
the commits and diff stat, and the workspace's Claude session, then asks
your own `claude` CLI to write a retrospective (overview, bugs & fixes with
root causes, key decisions, PRs, follow-ups).

Archives are saved per session under
`~/.local/state/pom/archives/<session>/<branch>.md`, so they **survive
deleting the workspace** and stay retrievable long after.

### Auto-archive on PR merge

Turn it on and once a workspace's pull request **merges** (and no PR on
that workspace is still open), Pomelo archives it automatically. Each
branch archives at most once.

Enable it in `pom.yml`:

```yaml
archive:
  auto_on_merge: true
```

It's **off by default**: generating an archive runs your `claude` CLI and
spends tokens, so Pomelo won't do it until you opt in.

### Recalling archives from a Claude session

When Pomelo launches a Claude window it grants that session read access to
this session's archive directory (`--add-dir`) and tells Claude the path.
So mid-task you can ask *"check the archive for `feat-login` — how did we
fix that bug?"* and Claude reads the past retrospectives directly. The
grant is scoped to the current session's archives only.

::: tip Uses your Claude plan
Generating an archive runs `claude -p` on your machine, so it consumes
tokens on your own Claude subscription/API. If `claude` isn't available the
collected context is still saved verbatim — you never end up with nothing.
:::

## Agent tools (MCP)

A Claude session running in a workspace can't see its own environment by
default — which port its dev server got, which database to migrate, whether
a service is even up. Pomelo closes that gap: when it launches a Claude
window it registers an **MCP server** scoped to that workspace, so the
agent can inspect and act on the *real running stack* it lives in.

The tools:

| Tool | What the agent can do |
| --- | --- |
| `workspace_info` / `services` / `ports` | See the branch, its repos, and each service's running state + allocated port |
| `databases` | Get ready-to-use per-branch Postgres connection strings |
| `service_start` / `service_stop` / `service_restart` | Bring services up/down (ports are pre-flighted) |
| `service_logs` | Read a service's recent output (e.g. to spot a crash) |
| `commands` | List the project's pre-written `setup` steps and `shortcuts` plus its package manager — so the agent runs *your* canonical install/migrate/lint/test commands |
| `run_shortcut` | Run one of those shortcuts by description, in the repo's resolved env |
| `run_in_env` | Run an arbitrary command in a worktree with the resolved env — migrations, tests, seeds — and read the result |
| `resolve_port_conflict` | Move the workspace to a clean port region when something else grabbed a port |
| `config_get` / `config_validate` / `config_set` | Read and safely edit `pom.yml` — every write is schema-validated before it lands, and new services get ports automatically |
| `config_files` / `config_file_get` / `config_file_set` | Edit a **split** config: list and edit the individual `pom.d/**` fragments |

So mid-task you can say *"the migration failed — check the DB and rerun
it"* or *"add a worker service and start it"*, and the agent uses these
tools instead of guessing. It reads your `shortcuts`/`setup` first, so it
runs your exact recipe rather than inventing one. Everything stays on your
machine.

`pom mcp` is the underlying command; it's wired up automatically, so you
rarely run it yourself.

### Multi-repo workspace map

A workspace with more than one repo is a *virtual monorepo*: the workspace
root is the parent of every repo's worktree, and Claude runs rooted there
so it can read across all of them. To keep that cheap, Pomelo writes a
concise `CLAUDE.md` **at the workspace root** — generated from your config —
that lists each repo (alias, folder, services, exposed variables,
databases) and the dev-proxy topology, plus the rule *"read across repos
freely, but scope each change to one repo / one PR."*

It's facts-only, regenerated on every Claude launch, written **only** when
a workspace has more than one repo, and never overwrites a hand-written
root `CLAUDE.md` (Pomelo only rewrites the file it generated, tagged with a
`pom:workspace-map` marker).

## Recovery

Workspace metadata lives entirely on disk (`.pom/` per project, plus the
`workspace--<branch>/` folders themselves) — so the app can quit and
reopen without losing state. If you clobber a folder by hand, Pomelo prunes
the stale git worktree registration automatically on the next create.
