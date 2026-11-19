import { t, table, type TableDatabase } from "/p/the8020/db/mod.ts";
import { packageId } from "../types/package.ts";
import { sourceInfo } from "../types/source.ts";

const NodePackages = table("the8020__packages__node_packages", {
  nodeId: t.text().primaryKey(),
  packageId: t.from(packageId).primaryKey(),
  ready: t.boolean().default(true),
  activeCommit: t.from(sourceInfo.shape.commit),
});

declare module "/p/the8020/db/types.ts" {
  interface Database extends TableDatabase<typeof NodePackages> {}
}
export default NodePackages;
