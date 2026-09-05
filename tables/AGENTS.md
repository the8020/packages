Parent DOX: [packages DOX](../AGENTS.md).

# Purpose

- Describe desired and active packages plus durable activation and hook history.

# Ownership

- Own `packages.ts`, `activations.ts`, `activation_packages.ts`, and
  `hook_runs.ts` and their descriptor tests; physical schema deployment remains
  kernel-owned.

# Local Contracts

- Default-export authored table descriptors through `/p/the8020/db/mod.ts`;
  table identity follows the package and file path.
- Exact active commits and activation phases are durable; hook attempts and
  success are recorded independently.
- Package source paths remain derived node-local state rather than authoritative
  shared paths.

# Work Guidance

# Verification

- From the repository root, run `deno task check` and `deno task test`.

# Child DOX Index

No child DOX documents. This document owns the entire local scope.
