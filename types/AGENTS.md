Parent DOX: [packages DOX](../AGENTS.md).

# Purpose

- Share package and program references across database tables, forms, and lists.

# Ownership

- Own `packageId` and `programId` semantic fields. The catalog and kernel own
  discovery; admin-core owns the linked administration screens.

# Local Contracts

- Definitions are ordinary Zod schemas with names, Markdown help, bounded value
  help, and lazy open callbacks. Imports perform no queries or screen calls.
- Package lookup searches the authored catalog in SQL. Program lookup searches
  the existing complete ready-program snapshot on the server; only the requested
  choices cross into UUI. Order both by ID before applying offset/limit.
- Open callbacks call the owning UUI program with its selected identifier.

# Work Guidance

- Keep positioning and read-only settings in consuming screens. Preserve
  table-specific keys and defaults in table declarations.

# Verification

- Run `deno task check` and `deno task test` from the package root. UUI's
  existing Programs browser flow exercises program lookup and selection in Run
  program.

# Child DOX Index

No child DOX documents. This document owns the entire local scope.
