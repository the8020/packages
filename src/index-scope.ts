import { context } from "@the8020/context";
import type { Database } from "/p/the8020/db/mod.ts";
import type { Transaction } from "/p/the8020/db/kysely.ts";
import type { ServiceIndexScope } from "@the8020/kernel";
import Packages from "../tables/packages.ts";
import NodePackages from "../tables/node_packages.ts";

/** During a rolling update only the system-published checkout owns shared declarations. */
export async function publishesSharedIndex(
  tx: Transaction<Database>,
  scope: ServiceIndexScope["packages"][number],
) {
  const shared = await tx.selectFrom(Packages.table).select([
    "activeCommit",
    "state",
  ])
    .where("packageId", "=", scope.package_id).executeTakeFirst();
  const sharedCommit = shared?.state === "ready" ? shared.activeCommit : null;
  const commit = scope.active ? scope.package_commit : null;
  if (commit === sharedCommit) return true;
  const installed = await tx.selectFrom(NodePackages.table).select(
    "activeCommit",
  )
    .where("ready", "=", true).where("nodeId", "=", context.nodeId).where(
      "packageId",
      "=",
      scope.package_id,
    ).executeTakeFirst();
  if ((installed?.activeCommit ?? null) !== commit) {
    throw new Error(`package ${scope.package_id} changed while indexing`);
  }
  return false;
}
