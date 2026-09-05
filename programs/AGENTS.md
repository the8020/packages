Parent DOX: [packages DOX](../AGENTS.md).

# Purpose

- Expose package catalog, desired-version, repository, and synchronization
  commands.

# Ownership

- Own hidden manifests and entrypoints; `../src/commands.ts` owns shared
  argument parsing and typed kernel calls.

# Local Contracts

- Preserve raw string argument handling and structured intentional input
  failures.
- Repository mutation and authentication remain kernel-owned; synchronization
  may consume only its execution-scoped optional Git token.

# Work Guidance

# Verification

- From the repository root, run `deno task check` and `deno task test`.

# Child DOX Index

No child DOX documents. This document owns the entire local scope.
