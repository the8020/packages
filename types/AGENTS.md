Parent DOX: [packages DOX](../AGENTS.md).

# Purpose

- Share package, program, and source/version fields across tables, forms, and
  lists.

# Ownership

- `package.ts` and `program.ts` own references and descriptive metadata.
- `source.ts` owns file/Git metadata and branch, commit, install-version, and
  installed-version field builders using the supplied bounded inspection.
- The catalog and kernel own discovery; admin-core owns linked screens.

# Local Contracts

- Definitions are ordinary Zod schemas with names, Markdown help, bounded value
  help, and lazy open callbacks. Imports perform no queries or screen calls.
- Package lookup exposes package ID/status through the shared SQL lookup.
  Program lookup exposes ID/description/interactive status from the complete
  ready-program snapshot. Both return typed row schemas with ID first; apply
  full list queries before paging and default to ID order.
- Open callbacks call the owning UUI program with its selected identifier.
- Git field builders retain their own inspected choices and expose value/name
  fields through ordinary list filtering, sorting, and paging. The choice values
  remain `latest`, `tag:<name>`, or `commit:<hash>` for version selection. They
  query no external data.
- Keep package namespaces distinct from commit author names.
- Known inspection/catalog statuses, program kinds, repository states, file
  types, and Git reference kinds use shared `choiceHelp`. Catalog package state
  stays distinct from the Ready/Needs attention inspection summary. Git
  selectors reuse that same helper with their inspected value/name pairs.

# Work Guidance

- Keep positioning and read-only settings in consuming screens. Preserve
  table-specific keys and defaults in table declarations.

# Verification

- Run `deno task check` and `deno task test` from the package root. UUI's
  existing Programs browser flow exercises program lookup and selection in Run
  program.
- `source_test.ts` checks independent field customization, version values,
  filtering, and page boundaries.

# Child DOX Index

No child DOX documents. This document owns the entire local scope.
