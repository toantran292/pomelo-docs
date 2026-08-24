# Databases

Pomelo auto-provisions one database per workspace per template, using the
shared service's admin credentials. You declare names with templates;
Pomelo does the create/drop/seed dance.

## Declare

Under a repo:

```yaml
repos:
  api:
    databases:
      main: "{{branch.safe}}"          # primary DB
      test: "{{branch.safe}}_test"     # separate test DB
    env:
      DATABASE_URL: "postgres://{{shared.postgres.url}}/{{db.main}}"
      TEST_DATABASE_URL: "postgres://{{shared.postgres.url}}/{{db.test}}"
```

`{{db.NAME}}` resolves to the named entry above (session-prefixed) — names
instead of positional indexes, so reordering the map never breaks a
reference. The env vars produced for a workspace on branch `feat/login`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:44800/myproject_feat_login
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:44800/myproject_feat_login_test
```

## Shared service credentials

The credentials come from the `db_user` / `db_password` fields on the
shared service (well-known Postgres fills them in by default):

```yaml
shared_services:
  postgres:
    db_user: postgres
    db_password: postgres
```

`{{shared.postgres.url}}` expands to `user:pass@host:port`.

## Seed from main

New workspaces can inherit their databases from the **main** workspace's
copies instead of building them from scratch:

```yaml
repos:
  api:
    seed_from_main: true   # clone api's DBs from main (CREATE DATABASE … TEMPLATE)
```

Set up main once (migrate + seed), and each new workspace clones the
prepared databases in seconds, with main's sample data — the repo's own
`seed` is skipped. If a main DB is missing, Pomelo falls back to an empty
create. See [Workspace › Seed from main](./workspace#seed-from-main).

## Manage

<Shot text="Reset databases from the workspace menu" />

Manage a workspace's databases from its menu in the app — create, drop, or
reset all databases for that workspace at once. Databases are also created
automatically when the workspace is created, and dropped when it's
deleted.

## Setup hooks

Use the repo-level `setup:` block for migrations / seeds that should run
right after the workspace is created:

```yaml
repos:
  api:
    setup:
      - bundle install
      - bundle exec rake db:migrate
      - bundle exec rake db:seed
```

These run after the worktree exists, the env file is written, and the
databases have been created — so `DATABASE_URL` is set correctly.

## Browsing data in the app

The **Database** tab (⌘4) inspects a branch's data without a separate DB
client. Pomelo already knows the connection, so there's nothing to wire up:

- A tree of every per-branch database down to its tables (Postgres) and
  keyspaces (Redis).
- Click a table to open it as a data grid with WHERE / ORDER BY and paging;
  a record panel shows one row vertically and export streams the full result
  to CSV.
- A SQL console with syntax highlighting and schema-aware autocomplete.

Made for the checks you run constantly while coding — inspect a row, confirm a
migration, tweak a query — right where you work, no separate client to wire up.
The workspace's [Claude agent](./workspace#agent-tools-mcp) can query the same
databases over MCP while it works.
