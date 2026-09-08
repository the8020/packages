import { secretName } from "/p/the8020/secrets/types/secret.ts";
import {
  field,
  type ValueHelpItem,
  type ValueHelpRequest,
  z,
} from "/p/the8020/db/fields.ts";
import type {
  PackageRepository,
  PackageSourceInspection,
  PackageVersions,
} from "@the8020/kernel";

export const sourceInfo = z.object({
  secretName: field(secretName, {
    label: "Authentication secret",
    description:
      "Choose credentials for a private repository. Leave empty for public access.",
  }),
  valid: field(z.boolean(), {
    label: "Valid",
    description:
      "Whether this declaration passed inspection and is available for use.",
  }),
  remoteUrl: field(z.string(), {
    label: "Remote URL",
    description:
      "The Git remote address used to fetch or publish repository changes.",
  }),
  source: field(z.string(), {
    label: "Git URL",
    description: "The HTTPS Git repository URL to install or update from.",
  }),
  path: field(z.string(), {
    label: "Path",
    description:
      "The location of the package or one of its source files or directories.",
  }),
  entrypoint: field(z.string(), {
    label: "Entrypoint",
    description:
      "The module that runs when this program or service is invoked.",
  }),
  commit: field(z.string(), {
    label: "Commit",
    description:
      "An exact Git commit identifying a version of the package source.",
  }),
  branch: field(z.string(), {
    label: "Branch",
    description:
      "A named line of development in the repository. Select a branch before checking it out.",
  }),
  tag: field(z.string(), {
    label: "Tag",
    description: "A named Git version, such as `v1.2.3`.",
  }),
  remoteName: field(z.string(), {
    label: "Remote",
    description:
      "The Git remote used for repository operations, usually `origin`.",
  }),
  repositoryStatus: field(z.string(), {
    label: "Status",
    description: "The repository state reported by Git inspection.",
  }),
  type: field(z.string(), {
    label: "Type",
    description:
      "Whether this package entry is a file, directory, or symbolic link.",
  }),
  kind: field(z.string(), {
    label: "Reference type",
    description: "Whether this Git reference is a branch or tag.",
  }),
  name: field(z.string(), {
    label: "Reference",
    description: "The branch or tag name advertised by the repository.",
  }),
  authoredAt: field(z.string(), {
    label: "Authored",
    description: "When the author recorded this commit.",
  }),
  author: field(z.string(), {
    label: "Commit author",
    description: "The name of the person who authored this commit.",
  }),
  tags: field(z.string(), {
    label: "Tags",
    description: "Git tags pointing to this commit.",
  }),
  subject: field(z.string(), {
    label: "Change",
    description: "The first line of the commit message describing this change.",
  }),
  clean: field(z.boolean(), {
    label: "Clean",
    description: "Whether the repository has no uncommitted changes.",
  }),
  activationReady: field(z.boolean(), {
    label: "Activation ready",
    description: "Whether this source is ready for activation.",
  }),
  size: field(z.number().int(), {
    label: "Size in bytes",
    description: "File size in bytes.",
  }),
  current: field(z.boolean(), {
    label: "Installed",
    description: "Whether this commit is the currently installed version.",
  }),
  selected: field(z.boolean(), {
    label: "Selected",
    description: "Whether this commit matches the requested package version.",
  }),
});

export const versionSelection = field(z.string().min(1), {
  label: "Version",
  description:
    "Choose `latest`, `tag:<name>`, or `commit:<hash>`, or search the available versions in field help. Applying replaces the installed version.",
});

export function repositoryFields(repository: PackageRepository) {
  return z.object({
    branch: field(sourceInfo.shape.branch, {
      valueHelp: choiceHelp(repository.branches.map((branch) => ({
        value: branch.name,
        label: branch.remote
          ? `${branch.name} (remote)`
          : branch.current
          ? `${branch.name} (current)`
          : branch.name,
      }))),
    }),
    commit: field(sourceInfo.shape.commit, {
      valueHelp: choiceHelp(repository.commits.map((commit) => ({
        value: commit.commit,
        label: `${commit.short_commit} — ${commit.subject}`,
      }))),
    }),
  });
}

export function sourceVersion(inspection?: PackageSourceInspection) {
  return field(versionSelection, {
    valueHelp: choiceHelp(sourceVersionOptions(inspection)),
  });
}

export function installedVersion(versions: PackageVersions) {
  return field(versionSelection, {
    valueHelp: choiceHelp(installedVersionOptions(versions)),
  });
}

export function sourceVersionOptions(inspection?: PackageSourceInspection) {
  const options = [{ value: "latest", label: "Latest default branch" }];
  if (inspection === undefined) return options;
  const seen = new Set<string>(["latest"]);
  for (const reference of inspection.references) {
    const value = reference.kind === "tag"
      ? `tag:${reference.name}`
      : `commit:${reference.commit}`;
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({
      value,
      label: reference.kind === "tag"
        ? `Tag ${reference.name}`
        : `${reference.name} (${reference.commit.slice(0, 12)})`,
    });
  }
  return options;
}

function installedVersionOptions(versions: PackageVersions) {
  const options = [{ value: "latest", label: "Latest default branch" }];
  for (const version of versions.versions) {
    for (const tag of version.tags) {
      options.push({ value: `tag:${tag}`, label: `Tag ${tag}` });
    }
    options.push({
      value: `commit:${version.commit}`,
      label: `${version.short_commit} — ${version.subject}`,
    });
  }
  return options;
}

/** Page an already bounded reference snapshot through ordinary field help. */
function choiceHelp<Value>(items: readonly ValueHelpItem<Value>[]) {
  return ({ query, offset, limit }: ValueHelpRequest) => {
    const search = query.trim().toLowerCase();
    const matches = items.filter((item) =>
      `${item.value} ${item.label} ${item.description ?? ""}`.toLowerCase()
        .includes(search)
    );
    return {
      items: matches.slice(offset, offset + limit),
      more: matches.length > offset + limit,
    };
  };
}
