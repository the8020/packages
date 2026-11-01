import { metadataText } from "../localization.ts";
import { kernel } from "@the8020/kernel";
import { type ProgramMetadata, readProgramMetadata } from "../programs.ts";
import { requireDevelopment } from "/p/the8020/system/profile.ts";
import { filter, requirePermission } from "/p/the8020/auth/mod.ts";
import { context } from "@the8020/context";

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

/** Application package mutations shared by programs and administration screens. */
export const packages = {
  ...kernel.packages,
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
    async inspect(source: string, options: { secret?: string } = {}) {
      const secret = options.secret?.trim();
      if (secret) {
        // Using a credential against an arbitrary URL needs the same authority
        // as recording that credential on the package.
        await requirePermission(
          "the8020.packages.package.edit",
          sourcePackageId(source),
        );
      }
      await requireDevelopment();
      return await kernel.packages.source.inspect(
        source,
        secret ? { secret } : {},
      );
    },
  },
  versions: {
    async list(...args: Parameters<typeof kernel.packages.versions.list>) {
      await requireView(args[0]);
      await requireDevelopment();
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
      await requireMutation("the8020.packages.package.synchronize", id);
    }
    return kernel.packages.synchronize(packageIds, gitToken, undefined, schema);
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
      await requireMutation(
        "the8020.packages.package.edit",
        `${input.author}/${input.repository}`,
      );
      return kernel.packages.index.set(input);
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
      return kernel.packages.repository.remote(input);
    },
    async checkout(
      input: Parameters<typeof kernel.packages.repository.checkout>[0],
    ) {
      await requireMutation(
        "the8020.packages.repository.edit",
        input.packageId,
      );
      return kernel.packages.repository.checkout(input);
    },
    async fetch(packageId: string) {
      await requireMutation("the8020.packages.repository.edit", packageId);
      return kernel.packages.repository.fetch(packageId);
    },
    async pull(packageId: string) {
      await requireMutation("the8020.packages.repository.edit", packageId);
      return kernel.packages.repository.pull(packageId);
    },
    async push(packageId: string) {
      await requireMutation("the8020.packages.repository.edit", packageId);
      return kernel.packages.repository.push(packageId);
    },
  },
};
