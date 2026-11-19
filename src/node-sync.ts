import { localizedText } from "/p/the8020/i18n/mod.ts";
import { msg } from "../i18n/messages.ts";
import { db } from "/p/the8020/db/mod.ts";
import { sql } from "/p/the8020/db/kysely.ts";
import { context } from "@the8020/context";
import Nodes from "/p/the8020/system/tables/nodes.ts";
import NodePackages from "../tables/node_packages.ts";
import Packages from "../tables/packages.ts";
import { viewablePackages } from "./admin.ts";

export async function packageDifferences() {
  const desired = sql<
    string
  >`case when p.state = 'retired' then '' when p."requestedTag" is not null then 'tag:' || p."requestedTag" else coalesce(p."requestedCommit", p."activeCommit", case when p.local then '' else 'latest' end) end`;
  const before = sql<string>`coalesce(i."activeCommit", '')`;
  const nodes = db.selectFrom(Nodes.table).select("id").where(
    "enabled",
    "=",
    true,
  )
    .union(db.selectNoFrom(sql<string>`${context.nodeId}`.as("id")));
  const rows = await db.selectFrom(nodes.as("n")).crossJoin(
    `${Packages.table} as p`,
  )
    .leftJoin(
      `${NodePackages.table} as i`,
      (join) =>
        join.onRef("i.nodeId", "=", "n.id").onRef(
          "i.packageId",
          "=",
          "p.packageId",
        ),
    )
    .select([
      "n.id as node",
      "p.packageId as package_id",
      before.as("before"),
      desired.as("desired"),
    ])
    .where((eb) =>
      eb.or([
        eb(before, "!=", desired),
        eb("i.ready", "=", false),
      ])
    ).orderBy("n.id").orderBy("p.packageId").limit(10001).execute();
  if (rows.length > 10000) {
    throw new Error(
      await localizedText(msg("errors.difference_limit")),
    );
  }
  return (await viewablePackages(rows)).map((row) => ({
    node: row.node,
    packageId: row.package_id,
    before: row.before,
    desired: row.desired,
  }));
}

export async function synchronizeNode(
  row: { node: string; packageId: string; before: string; desired: string },
) {
  const { syncPackageOnNode } = await import(
    "/p/the8020/deployments/src/package-change.ts"
  );
  return await syncPackageOnNode(row);
}
