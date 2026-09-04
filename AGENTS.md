# Purpose

- Own the desired and active first-party package catalog plus durable package
  activation and hook history.
- This file is the root contract of the independent `the8020/packages`
  repository.

# Ownership

- Own authored schemas and administrative command programs for packages,
  activation batches, activation members, and hook runs.
- Do not own Git worktrees, schema DDL, application tables, services, or the
  kernel's built-in `_8020_*` catalog.

# Local Contracts

- Exact active commits and activation phases are durable database state.
- Hook completion is at-least-once and therefore records attempts and success
  independently for each package and hook.
- Package source paths remain derived node-local state and are never stored as
  authoritative shared paths.
- `cbus/commands/**/command.toml` maps visible `packages.*` commands to
  non-discoverable ordinary programs. Programs parse raw string arguments and
  report intentional input errors structurally before calling typed kernel
  package operations; synchronization may consume only its execution-scoped
  optional Git token.

# Verification

- `deno task check` formats, lints, and type-checks all table modules.
- `deno task test` verifies stable table descriptors and composite identities.

# Child DOX Index
