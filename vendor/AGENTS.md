Parent DOX: [packages DOX](../AGENTS.md).

# Purpose

- Ship the package-owned TOML dependencies as single-file bundles.

# Ownership

- `smol-toml.ts` pins the program-manifest parser; `toml.ts` pins the standard
  declaration parser exposed through `../toml.ts`. These entrypoints supply
  original types through `@deno-types`; generated `.js` bundles and upstream
  license notices ship with this package.

# Local Contracts

- Preserve both existing parsers and their behavior. Only external dependencies
  enter the bundles; application source remains ordinary modules.
- Regenerate and commit JavaScript when changing a pin. Preserve upstream
  exports and names; do not edit generated files.

# Work Guidance

# Verification

- Run `deno task bundle`, `deno task check`, and `deno task test` from the
  package root.

# Child DOX Index

No child DOX documents. This document owns the entire local scope.
