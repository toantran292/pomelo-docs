# Workspace lifecycle

A workspace is one isolated copy of your project, anchored to a git
branch. Each lives in its own `workspace--<branch>/` folder containing
a git worktree per repo, with its own ports, env, and databases.

## Create

From the web UI: use the create-workspace control, type the branch name,
and pick the repos.

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

::: tip Uses your Claude plan
Generating an archive runs `claude -p` on your machine, so it consumes
tokens on your own Claude subscription/API. The Claude session transcript
is bounded before it's sent, and if `claude` isn't available the collected
context is still saved verbatim — you never end up with nothing.
:::

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
