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
worktrees, per-branch databases, ports, env all provisioned — tncli opens
a Claude session in it that's **already primed with the ticket** (its
summary and description are injected into the session's context) and wired
to the [MCP tools](#agent-tools-mcp). You review and say "go" — the agent
starts with full context and can inspect ports, run migrations/tests
against the real stack, and open a PR. Any Claude session in a
ticket-prefixed workspace gets this ticket context automatically, button or
not.

From the CLI:

```bash
tncli workspace create <combo> <branch>
```

Behind the scenes a 7-stage pipeline runs (validate → provision → infra
→ source → configure → setup → network). Stages 4–6 fan out one
goroutine per repo. The web dashboard streams progress live; the CLI
prints it event-by-event.

To extend an existing workspace, use the same control on the workspace
row to add or remove individual repos.

## List

```bash
tncli workspace list
```

Each row shows the branch, included repos, current running services
count, and the workspace port block.

## Delete

From the web UI: use the delete control on a workspace row, then confirm.

From the CLI:

```bash
tncli workspace delete <branch>
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
`~/.local/state/tncli/archives/<session>/<branch>.md`, so they **survive
deleting the workspace** and stay retrievable long after.

From the web UI: a workspace's **⋯** menu → **Archive to Markdown**, or tick
the box in the delete dialog. Browse and read past archives from the
**⤓** button in the sidebar footer.

From the CLI:

```bash
tncli archive <branch>          # generate (invokes your claude CLI)
tncli archive list              # list this session's archives
tncli archive show <branch>     # print one
tncli archive path              # print the archive directory
```

### Recalling archives from a Claude session

You don't have to remember any of this while working. When tncli launches
a **Claude Code** window, it grants that session read access to this
session's archive directory (`--add-dir`) and tells Claude the path plus
the `tncli archive list` / `tncli archive show <branch>` commands. So mid-
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
whether a service is even up. tncli closes that gap: when it launches a
Claude window it registers an **MCP server** scoped to that workspace, so
the agent can inspect and act on the *real running stack* it lives in.

The tools:

| Tool | What the agent can do |
| --- | --- |
| `workspace_info` / `services` / `ports` | See the branch, its repos, and each service's running state + allocated port |
| `databases` | Get ready-to-use per-branch Postgres connection strings |
| `service_start` / `service_stop` / `service_restart` | Bring services up/down (ports are pre-flighted — a started service binds the port tncli reports) |
| `service_logs` | Read a service's recent output (e.g. to spot a crash) |
| `run_in_env` | Run a command in a worktree with the resolved env — migrations, tests, seeds — and read the result, verifying against the actual stack |
| `resolve_port_conflict` | Self-heal: move the workspace to a clean port region when something else grabbed a port |
| `config_get` / `config_validate` / `config_set` | Read and safely edit `tncli.yml` — every write is schema-validated before it lands, and new services get ports automatically |

So mid-task you can say *"the migration failed — check the DB and rerun
it"* or *"add a worker service and start it"*, and the agent uses these
tools instead of guessing ports or hand-editing config. It talks to your
already-running dashboard over loopback; nothing leaves your machine.

`tncli mcp` is the underlying command; it's wired up automatically, so you
rarely run it yourself.

## Recovery

Workspace metadata lives entirely on disk (`.tncli/network.json` per
project, plus the `workspace--<branch>/` folders themselves) — so
`tncli` can be killed and restarted without losing state. If you
clobber the folder by hand, `tncli workspace list` will refuse to
re-introduce stale port blocks.

## Tips

- The dashboard auto-collapses workspaces with zero running services so
  the tree stays scannable when you have many branches active. Expand a
  row to reopen it; the choice persists.
- For a one-off check (e.g. before a PR) you don't need a workspace at
  all — just create one ad-hoc and `tncli workspace delete` when done.
