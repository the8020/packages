import { kernel } from "@the8020/kernel";
import { type ProgramMetadata, readProgramMetadata } from "../programs.ts";
import { requireDevelopment } from "/p/the8020/system/profile.ts";
import { requirePermission } from "/p/the8020/auth/mod.ts";

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

async function requireMutation(action: string, value: string) {
  await requirePermission(action, value);
  await requireDevelopment();
}

/** Application package mutations shared by programs and administration screens. */
export const packages = {
  ...kernel.packages,
  source: {
    async inspect(source: string) {
      await requireDevelopment();
      return await kernel.packages.source.inspect(source);
    },
  },
  versions: {
    async list(...args: Parameters<typeof kernel.packages.versions.list>) {
      await requireDevelopment();
      return await kernel.packages.versions.list(...args);
    },
  },
  async inspect(packageId: string): Promise<PackageInspection> {
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
          })
          : { description: "", uui: false, discoverable: false };
      programs.push({ ...program, ...metadata });
    }
    return { ...inspected, programs };
  },
  async delete(packageId: string, confirm: true) {
    await requireMutation("packages.package.delete", packageId);
    return kernel.packages.delete(packageId, confirm);
  },
  async synchronize(packageIds: string[] = [], gitToken?: string) {
    for (const id of packageIds.length ? packageIds : ["*"]) {
      await requireMutation("packages.package.synchronize", id);
    }
    return kernel.packages.synchronize(packageIds, gitToken);
  },
  index: {
    ...kernel.packages.index,
    async set(input: Parameters<typeof kernel.packages.index.set>[0]) {
      await requireMutation(
        "packages.package.edit",
        `${input.author}/${input.repository}`,
      );
      return kernel.packages.index.set(input);
    },
  },
  local: {
    async create(input: Parameters<typeof kernel.packages.local.create>[0]) {
      await requireMutation(
        "packages.package.create",
        `${input.author}/${input.repository}`,
      );
      return kernel.packages.local.create(input);
    },
  },
  repository: {
    ...kernel.packages.repository,
    async initialize(
      input: Parameters<typeof kernel.packages.repository.initialize>[0],
    ) {
      await requireMutation(
        "packages.repository.edit",
        String(input.package_id),
      );
      return kernel.packages.repository.initialize(input);
    },
    async remote(
      input: Parameters<typeof kernel.packages.repository.remote>[0],
    ) {
      await requireMutation(
        "packages.repository.edit",
        String(input.package_id),
      );
      return kernel.packages.repository.remote(input);
    },
    async checkout(
      input: Parameters<typeof kernel.packages.repository.checkout>[0],
    ) {
      await requireMutation("packages.repository.edit", input.packageId);
      return kernel.packages.repository.checkout(input);
    },
    async pull(packageId: string) {
      await requireMutation("packages.repository.edit", packageId);
      return kernel.packages.repository.pull(packageId);
    },
    async push(packageId: string) {
      await requireMutation("packages.repository.edit", packageId);
      return kernel.packages.repository.push(packageId);
    },
  },
};
