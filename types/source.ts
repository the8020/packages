import type { ValueHelpItem } from "/p/the8020/db/fields.ts";
import { msg } from "/p/the8020/packages/i18n/messages.ts";
import { secretName } from "/p/the8020/secrets/types/secret.ts";
import { choiceHelp, field, z } from "/p/the8020/db/fields.ts";
import type {
  PackageRepository,
  PackageSourceInspection,
  PackageVersions,
} from "@the8020/kernel";

export const sourceInfo = z.object({
  secretName: field(secretName, {
    label: msg("source.authentication_secret"),
    description: msg(
      "source.choose_credentials_for_a_private_repository_leave",
    ),
  }),
  valid: field(z.boolean(), {
    label: msg("package.valid"),
    description: msg(
      "source.whether_this_declaration_passed_inspection_and_is",
    ),
  }),
  remoteUrl: field(z.string(), {
    label: msg("source.remote_url"),
    description: msg("source.the_git_remote_address_used_to_fetch"),
  }),
  source: field(z.string(), {
    label: msg("source.git_url"),
    description: msg("source.the_http_or_https_git_repository_url"),
  }),
  path: field(z.string(), {
    label: msg("source.path"),
    description: msg("source.the_location_of_the_package_or_one"),
  }),
  entrypoint: field(z.string(), {
    label: msg("source.entrypoint"),
    description: msg("source.the_module_that_runs_when_this_program"),
  }),
  commit: field(z.string(), {
    label: msg("source.commit"),
    description: msg("source.an_exact_git_commit_identifying_a_version"),
  }),
  branch: field(z.string(), {
    label: msg("source.branch"),
    description: msg("source.a_named_line_of_development_in_the"),
  }),
  tag: field(z.string(), {
    label: msg("source.tag"),
    description: msg("source.a_named_git_version_such_as_v1"),
  }),
  remoteName: field(z.string(), {
    label: msg("source.remote"),
    description: msg("source.the_git_remote_used_for_repository_operations"),
  }),
  repositoryStatus: field(z.string(), {
    label: msg("package.status"),
    description: msg("source.the_repository_state_reported_by_git_inspection"),
    valueHelp: choiceHelp(z.string(), [
      "ready",
      "not-initialized",
      "invalid-git-metadata",
      "missing-initial-commit",
      "shared-worktree-modified",
    ]),
  }),
  type: field(z.string(), {
    label: msg("source.type"),
    description: msg("source.whether_this_package_entry_is_a_regular"),
    valueHelp: choiceHelp(z.string(), ["file", "symlink", "other"]),
  }),
  kind: field(z.string(), {
    label: msg("source.reference_type"),
    description: msg("source.whether_this_git_reference_is_a_branch"),
    valueHelp: choiceHelp(z.string(), ["branch", "tag"]),
  }),
  name: field(z.string(), {
    label: msg("source.reference"),
    description: msg("source.the_branch_or_tag_name_advertised_by"),
  }),
  authoredAt: field(z.string(), {
    label: msg("source.authored"),
    description: msg("source.when_the_author_recorded_this_commit"),
  }),
  author: field(z.string(), {
    label: msg("source.commit_author"),
    description: msg("source.the_name_of_the_person_who_authored"),
  }),
  tags: field(z.string(), {
    label: msg("source.tags"),
    description: msg("source.git_tags_pointing_to_this_commit"),
  }),
  subject: field(z.string(), {
    label: msg("source.change"),
    description: msg("source.the_first_line_of_the_commit_message"),
  }),
  clean: field(z.boolean(), {
    label: msg("source.clean"),
    description: msg(
      "source.whether_the_repository_has_no_uncommitted_changes",
    ),
  }),
  activationReady: field(z.boolean(), {
    label: msg("source.activation_ready"),
    description: msg("source.whether_this_source_is_ready_for_activation"),
  }),
  size: field(z.number().int(), {
    label: msg("source.size_in_bytes"),
    description: msg("source.file_size_in_bytes"),
  }),
  current: field(z.boolean(), {
    label: msg("source.installed"),
    description: msg("source.whether_this_commit_is_the_currently_installed"),
  }),
  selected: field(z.boolean(), {
    label: msg("source.selected"),
    description: msg(
      "source.whether_this_commit_matches_the_requested_package",
    ),
  }),
});

export const versionSelection = field(z.string().min(1), {
  label: msg("source.version"),
  description: msg("source.choose_latest_tag_name_or_commit_hash"),
});

export function repositoryFields(repository: PackageRepository) {
  return z.object({
    branch: field(sourceInfo.shape.branch, {
      valueHelp: choiceHelp(
        sourceInfo.shape.branch,
        repository.branches.map((branch) => ({
          value: branch.name,
          label: branch.remote
            ? msg("source.remote_branch", { name: branch.name })
            : branch.current
            ? msg("source.current_branch", { name: branch.name })
            : branch.name,
        })),
      ),
    }),
    commit: field(sourceInfo.shape.commit, {
      valueHelp: choiceHelp(
        sourceInfo.shape.commit,
        repository.commits.map((commit) => ({
          value: commit.commit,
          label: msg("source.value1_value2", {
            value1: commit.short_commit,
            value2: commit.subject,
          }),
        })),
      ),
    }),
  });
}

export function sourceVersion(inspection?: PackageSourceInspection) {
  return field(versionSelection, {
    valueHelp: choiceHelp(versionSelection, sourceVersionOptions(inspection)),
  });
}

export function installedVersion(versions: PackageVersions) {
  return field(versionSelection, {
    valueHelp: choiceHelp(versionSelection, installedVersionOptions(versions)),
  });
}

export function sourceVersionOptions(inspection?: PackageSourceInspection) {
  const options: ValueHelpItem<string>[] = [{
    value: "latest",
    label: msg("source.latest_default_branch"),
  }];
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
        ? msg("source.tag_name", { name: reference.name })
        : `${reference.name} (${reference.commit.slice(0, 12)})`,
    });
  }
  return options;
}

function installedVersionOptions(versions: PackageVersions) {
  const options: ValueHelpItem<string>[] = [{
    value: "latest",
    label: msg("source.latest_default_branch"),
  }];
  for (const version of versions.versions) {
    for (const tag of version.tags) {
      options.push({
        value: `tag:${tag}`,
        label: msg("source.tag_tag", { tag: tag }),
      });
    }
    options.push({
      value: `commit:${version.commit}`,
      label: msg("source.value1_value2", {
        value1: version.short_commit,
        value2: version.subject,
      }),
    });
  }
  return options;
}
