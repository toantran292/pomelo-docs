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
