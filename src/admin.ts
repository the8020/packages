import { kernel } from "@the8020/kernel";
import { requirePermission } from "/p/the8020/auth/mod.ts";

/** Application package mutations shared by programs and administration screens. */
export const packages: typeof kernel.packages = {
  ...kernel.packages,
  async delete(packageId, confirm) {
    await requirePermission("packages.package.delete", packageId);
    return kernel.packages.delete(packageId, confirm);
  },
  async synchronize(packageIds = [], gitToken) {
    for (const id of packageIds.length ? packageIds : ["*"]) {
      await requirePermission("packages.package.synchronize", id);
    }
    return kernel.packages.synchronize(packageIds, gitToken);
  },
  index: {
    ...kernel.packages.index,
    async set(input) {
      await requirePermission(
        "packages.package.edit",
        `${input.author}/${input.repository}`,
      );
      return kernel.packages.index.set(input);
    },
  },
  local: {
    async create(input) {
      await requirePermission(
        "packages.package.create",
        `${input.author}/${input.repository}`,
      );
      return kernel.packages.local.create(input);
    },
  },
  repository: {
    ...kernel.packages.repository,
    async initialize(input) {
      await requirePermission(
        "packages.repository.edit",
        String(input.package_id),
      );
      return kernel.packages.repository.initialize(input);
    },
    async remote(input) {
      await requirePermission(
        "packages.repository.edit",
        String(input.package_id),
      );
      return kernel.packages.repository.remote(input);
    },
    async checkout(input) {
      await requirePermission("packages.repository.edit", input.packageId);
      return kernel.packages.repository.checkout(input);
    },
    async pull(packageId) {
      await requirePermission("packages.repository.edit", packageId);
      return kernel.packages.repository.pull(packageId);
    },
    async push(packageId) {
      await requirePermission("packages.repository.edit", packageId);
      return kernel.packages.repository.push(packageId);
    },
  },
};
