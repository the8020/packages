import { localizedText as resolveMessage } from "/p/the8020/i18n/mod.ts";
import { msg as messageSymbol } from "/p/the8020/packages/i18n/messages.ts";
import { metadataText } from "../localization.ts";
import { kernel } from "@the8020/kernel";
import { type ProgramMetadata, readProgramMetadata } from "../programs.ts";
import {
  getSystemProfile,
  requireDevelopment,
} from "/p/the8020/system/profile.ts";
import { filter, requirePermission } from "/p/the8020/auth/mod.ts";
import { context } from "@the8020/context";
import { importedPackages, PACKAGE_ID } from "./dependencies.ts";

interface ExecutablePackageProgram {
  program_id: string;
  path: string;
  entrypoint?: string;
  entrypoint_url?: string;
  valid: boolean;
  validation_errors?: string[] | null;
}

export interface PackageProgram
  extends ExecutablePackageProgram, ProgramMetadata {}

export interface PackageFile {
  path: string;
  type: string;
  size: number;
}

export interface PackageInspection {
  package_id: string;
  path: string;
  description?: string;
  documentation_url?: string;
  license?: string;
  valid: boolean;
  programs?: PackageProgram[] | null;
  files?: PackageFile[] | null;
  contents_truncated?: boolean;
  validation_errors?: string[] | null;
  inspection_errors?: string[] | null;
}

/** The package ID the kernel derives from a source URL's final two segments. */
function sourcePackageId(source: string): string {
  try {
    const parts = new URL(source.trim()).pathname.split("/").filter(Boolean);
    const repository = parts.at(-1)?.replace(/\.git$/, "");
    const author = parts.at(-2);
    if (author && repository) return `${author}/${repository}`;
  } catch {
    // The kernel rejects the invalid source with its own message.
  }
  return source;
}

const VIEW = "the8020.packages.package.view";

/** Package reads are allowed per package ID. */
function requireView(packageId: string) {
  return requirePermission(VIEW, packageId);
}

/** Keep records of viewable packages; never audits. */
export function viewablePackages<T extends { package_id: string }>(
  rows: T[],
): Promise<T[]> {
  return filter(
    context.username,
    rows,
    { package_id: VIEW } as Partial<Record<keyof T, string>>,
  );
}

async function requireMutation(action: string, value: string) {
  await requirePermission(action, value);
  await requireDevelopment();
}

async function selectedTransport(packageId: string, source?: string) {
  const { developmentTransport } = await import(
    "/p/the8020/deployments/src/versions.ts"
  );
  return developmentTransport(packageId, source);
}

async function isDevelopment() {
  return (await getSystemProfile()).role === "development";
}

export async function resolvePackageSelection(
  packageId: string,
  input: { source?: string; secret?: string; commit?: string; tag?: string },
) {
  if (input.commit && input.tag) {
    throw new Error(
      await resolveMessage(messageSymbol("errors.select_version")),
    );
  }
  if (input.commit && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(input.commit)) {
    return input.commit.toLowerCase();
  }
  const route = await isDevelopment()
    ? { source: input.source ?? "", transport_secret: input.secret }
    : await selectedTransport(packageId, input.source);
  if (input.commit) {
    return kernel.packages.transport.resolve(route, input.commit);
  }
  if (input.tag) {
    return kernel.packages.transport.resolve(route, "tag:" + input.tag);
  }
  const { default_commit: commit } = await kernel.packages.transport.inspect(
    route,
  );
  if (!commit) {
    throw new Error(
      await resolveMessage(messageSymbol("errors.select_version")),
    );
  }
  return commit;
}

/** Application package mutations shared by programs and administration screens. */
export const packages = {
  ...kernel.packages,
  isDevelopment,
  async list<
    Result extends { package_id: string; description?: string } = {
      package_id: string;
    },
  >(): Promise<Result[]> {
    const rows = await viewablePackages(await kernel.packages.list<Result>());
    for (const row of rows) {
      if (typeof row.description === "string") {
        row.description = await metadataText(
          row.package_id,
          "package.description",
          row.description,
        );
      }
    }
    return rows;
  },
  source: {
    /** Inspect a source; a secret name authenticates a private repository. */
    async inspect(
      source: string,
      options: { secret?: string; packageId?: string } = {},
    ) {
      const secret = options.secret?.trim();
      if (!await isDevelopment()) {
        const input = source.trim();
        const byId = PACKAGE_ID.test(input);
        const packageId = options.packageId ??
          (byId ? input : sourcePackageId(input));
        await requireView(packageId);
        const inspected = await kernel.packages.transport.inspect(
          await selectedTransport(packageId, byId ? undefined : input),
        );
        return byId ? inspected : { ...inspected, source: input };
      }
      if (secret) {
        // Using a credential against an arbitrary URL needs the same authority
        // as recording that credential on the package.
        await requirePermission(
          "the8020.packages.package.edit",
          sourcePackageId(source),
        );
      }
      return await kernel.packages.source.inspect(
        source,
        secret ? { secret } : {},
      );
    },
  },
  /** Other packages imported by the active source of a viewable package. */
  async dependencies(packageId: string): Promise<string[]> {
    if (!PACKAGE_ID.test(packageId)) {
      throw new TypeError(
        await resolveMessage(
          messageSymbol("errors.invalid_package_id", {
            packageId: String(packageId),
          }),
        ),
      );
    }
    await requireView(packageId);
    return await importedPackages(
      `/workspace/packages/${packageId}`,
      packageId,
    );
  },
  versions: {
    async list(...args: Parameters<typeof kernel.packages.versions.list>) {
      await requireView(args[0]);
      if (!await isDevelopment()) {
        const index = await kernel.packages.index.inspect(args[0]);
        return kernel.packages.transport.versions(
          args[0],
          await selectedTransport(args[0], index.source),
          args[1],
        );
      }
      return await kernel.packages.versions.list(...args);
    },
  },
  async inspect(packageId: string): Promise<PackageInspection> {
    await requireView(packageId);
    const inspected = await kernel.packages.inspect<
      Omit<PackageInspection, "programs"> & {
        programs?: ExecutablePackageProgram[] | null;
      }
    >(packageId);
    const programs: PackageProgram[] = [];
    for (const program of inspected.programs ?? []) {
      const metadata =
        program.valid && program.entrypoint && program.entrypoint_url
          ? await readProgramMetadata({
            entrypoint: program.entrypoint,
            entrypoint_url: program.entrypoint_url,
          }, program.program_id)
          : { description: "", uui: false, discoverable: false };
      programs.push({ ...program, ...metadata });
    }
    return {
      ...inspected,
      programs,
      description: await metadataText(
        packageId,
        "package.description",
        inspected.description ?? "",
      ),
    };
  },
  async delete(packageId: string, confirm: true) {
    await requireMutation("the8020.packages.package.delete", packageId);
    return kernel.packages.delete(packageId, confirm);
  },
  async synchronize(
    packageIds: string[] = [],
    gitToken?: string,
    schema: Parameters<typeof kernel.packages.synchronize>[3] = {},
  ) {
    for (const id of packageIds.length ? packageIds : ["*"]) {
      await requirePermission("the8020.packages.package.synchronize", id);
    }
    if (await isDevelopment()) {
      return kernel.packages.synchronize(
        packageIds,
        gitToken,
        undefined,
        schema,
      );
    }
    if (
      (schema.schema_preview || schema.force_columns?.length ||
        schema.approved_plan) && packageIds.length !== 1
    ) {
      throw new Error(
        await resolveMessage(messageSymbol("errors.schema_selection")),
      );
    }
    const results = [];
    const ids = packageIds.length
      ? [...new Set(packageIds)]
      : (await kernel.packages.index.list()).map((row) => row.package_id);
    for (const id of ids) {
      const index = await kernel.packages.index.inspect(id);
      if (schema.schema_preview) {
        results.push(
          ...await kernel.packages.transport.sync(
            id,
            await selectedTransport(id, index.source),
            schema,
          ),
        );
        continue;
      }
      const { changePackage, syncPackageOnNode } = await import(
        "/p/the8020/deployments/src/package-change.ts"
      );
      try {
        const commit = await resolvePackageSelection(id, index);
        if (
          index.commit === commit && !schema.force_columns?.length &&
          !schema.approved_plan
        ) {
          await syncPackageOnNode({
            node: context.nodeId,
            packageId: id,
            before: index.active_commit ?? "",
            desired: commit,
          });
        } else {
          await changePackage(id, commit, index.source, {
            forceColumns: schema.force_columns,
            approvedPlan: schema.approved_plan,
          });
        }
        results.push({ package_id: id, commit, success: true });
      } catch (error) {
        results.push({
          package_id: id,
          commit: "",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return results;
  },
  async repair(
    packageId: string,
    input: { source: string; secret?: string; commit?: string; confirm: true },
  ) {
    await requirePermission("the8020.packages.repository.edit", packageId);
    await requirePermission("the8020.packages.package.edit", packageId);
    if (input.confirm !== true) {
      throw new Error(
        await resolveMessage(messageSymbol("errors.confirm_upstream")),
      );
    }
    if (input.secret?.trim().startsWith("deployments.peer.")) {
      throw new Error(
        await resolveMessage(messageSymbol("errors.upstream_credential")),
      );
    }
    if (input.secret) {
      await requirePermission(
        "the8020.packages.package.edit",
        sourcePackageId(input.source),
      );
    }
    if (!input.commit) {
      return kernel.packages.transport.versions(packageId, {
        source: input.source,
        transport_secret: input.secret,
      }, 200);
    }
    await requirePermission("the8020.packages.package.synchronize", packageId);
    const { changePackage } = await import(
      "/p/the8020/deployments/src/package-change.ts"
    );
    return changePackage(packageId, input.commit, undefined, {
      repair: { source: input.source, secret: input.secret },
    });
  },
  index: {
    ...kernel.packages.index,
    async list() {
      return await viewablePackages(await kernel.packages.index.list());
    },
    async inspect(packageId: string) {
      await requireView(packageId);
      return await kernel.packages.index.inspect(packageId);
    },
    async set(input: Parameters<typeof kernel.packages.index.set>[0]) {
      if (input.local) await requireDevelopment();
      await requirePermission(
        "the8020.packages.package.edit",
        `${input.author}/${input.repository}`,
      );
      if (input.local) return kernel.packages.index.set(input);
      const id = `${input.author}/${input.repository}`;
      if (!input.source && !await isDevelopment()) {
        input = { ...input, source: (await selectedTransport(id)).source };
      }
      const commit = await resolvePackageSelection(id, input);
      return kernel.packages.index.set({ ...input, commit, tag: undefined });
    },
  },
  local: {
    async create(input: Parameters<typeof kernel.packages.local.create>[0]) {
      await requireMutation(
        "the8020.packages.package.create",
        `${input.author}/${input.repository}`,
      );
      return kernel.packages.local.create(input);
    },
  },
  repository: {
    ...kernel.packages.repository,
    async list() {
      return await viewablePackages(
        await kernel.packages.repository.list() as { package_id: string }[],
      );
    },
    async status(packageId: string) {
      await requireView(packageId);
      return await kernel.packages.repository.status(packageId);
    },
    async inspect(packageId: string) {
      await requireView(packageId);
      return await kernel.packages.repository.inspect(packageId);
    },
    async initialize(
      input: Parameters<typeof kernel.packages.repository.initialize>[0],
    ) {
      await requireMutation(
        "the8020.packages.repository.edit",
        String(input.package_id),
      );
      return kernel.packages.repository.initialize(input);
    },
    async remote(
      input: Parameters<typeof kernel.packages.repository.remote>[0],
    ) {
      await requireMutation(
        "the8020.packages.repository.edit",
        String(input.package_id),
      );
      if (input.url && (!input.name || input.name === "origin")) {
        const { default: Packages } = await import("../tables/packages.ts");
        const id = String(input.package_id);
        const entry = await Packages.selectAll().where(
          Packages.packageId,
          "=",
          id,
        ).executeTakeFirst();
        if (entry && !entry.local && entry.source !== input.url) {
          await requirePermission("the8020.packages.package.edit", id);
          const stored = await kernel.packages.index.set({
            author: entry.author,
            repository: entry.repository,
            source: String(input.url),
            commit: entry.requestedCommit ?? undefined,
            tag: entry.requestedTag ?? undefined,
          });
          input = { ...input, url: stored.source };
        }
      }
      return kernel.packages.repository.remote(input);
    },
    async checkout(
      input: Parameters<typeof kernel.packages.repository.checkout>[0],
    ) {
      await requirePermission(
        "the8020.packages.repository.edit",
        input.packageId,
      );
      if (!await isDevelopment()) {
        const index = await kernel.packages.index.inspect(input.packageId);
        let commit = input.commit;
        if (input.branch) {
          const refs = await kernel.packages.transport.inspect(
            await selectedTransport(input.packageId, index.source),
          );
          commit = refs.references.find((ref) =>
            ref.kind === "branch" && ref.name === input.branch
          )?.commit;
        }
        if (!commit) {
          throw new Error(
            await resolveMessage(messageSymbol("errors.select_version")),
          );
        }
        const { changePackage } = await import(
          "/p/the8020/deployments/src/package-change.ts"
        );
        await changePackage(input.packageId, commit, index.source);
        return kernel.packages.repository.inspect(input.packageId);
      }
      return kernel.packages.repository.checkout(input);
    },
    async fetch(packageId: string) {
      await requirePermission("the8020.packages.repository.edit", packageId);
      if (!await isDevelopment()) {
        const index = await kernel.packages.index.inspect(packageId);
        return kernel.packages.transport.fetch(
          packageId,
          await selectedTransport(packageId, index.source),
        );
      }
      return kernel.packages.repository.fetch(packageId);
    },
    async pull(packageId: string) {
      await requirePermission("the8020.packages.repository.edit", packageId);
      if (!await isDevelopment()) {
        const index = await kernel.packages.index.inspect(packageId);
        const versions = await kernel.packages.transport.versions(
          packageId,
          await selectedTransport(packageId, index.source),
          1,
        );
        if (versions.update_commit) {
          const { changePackage } = await import(
            "/p/the8020/deployments/src/package-change.ts"
          );
          await changePackage(packageId, versions.update_commit, index.source, {
            before: versions.current_commit,
          });
        }
        return kernel.packages.repository.inspect(packageId);
      }
      return kernel.packages.repository.pull(packageId);
    },
    async push(packageId: string) {
      await requireMutation("the8020.packages.repository.edit", packageId);
      return kernel.packages.repository.push(packageId);
    },
  },
};
