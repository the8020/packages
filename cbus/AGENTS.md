Parent DOX: [packages DOX](../AGENTS.md).

# Purpose

- Declare the public `packages.*` administrative commands.

# Ownership

- Own the flat `commands/*.toml` declarations; the repository root owns package
  identity and `programs/` owns execution.

# Local Contracts

- `packages.repair <id> --source <url> --confirm` fetches upstream versions.
  Adding `--commit <sha>` applies the selected commit. An optional `--secret`
  names an upstream credential. The ordinary fetch path stays on development
  Git.

- Each declaration supplies the complete public name in `command` and references
  an ordinary program by its full `namespace/package/program` ID in `program`.
  Short names are invalid; the target may belong to another package.
- Keep declarations flat. Filenames do not define command identity, and
  duplicate public names are invalid.
- `packages.delete <package-id> --confirm` exposes confirmed package deletion.
- `packages.repository.fetch <package-id>` downloads refs/tags without moving
  the installed checkout or activating a version.
- On test and production, `packages.source.inspect` accepts a package ID and
  looks it up on development, including packages created locally there.

# Work Guidance

- Keep command behavior in the owning program or shared implementation.

# Verification

- Kernel CBus discovery and package tests cover declaration validation; use
  `go test ./kernel/cbus/... ./kernel/packages/...` from the sibling kernel
  repository with its local Go environment.
- Run this package's `deno task check` for the referenced program sources.

# Child DOX Index

No child DOX documents. This document owns the entire local scope.
