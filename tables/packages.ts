import { type Row, t, table, type TableDatabase } from "/p/the8020/db/mod.ts";
import { packageId } from "../types/package.ts";
import { secretName } from "/p/the8020/secrets/types/secret.ts";

const Packages = table("the8020__packages__packages", {
  packageId: t.from(packageId).primaryKey(),
  author: t.text(),
  repository: t.text(),
  source: t.text().nullable(),
  requestedCommit: t.text().nullable(),
  requestedTag: t.text().nullable(),
  secretName: t.from(secretName).nullable(),
  local: t.boolean().default(false),
  activeCommit: t.text().nullable(),
  state: t.enum(
    ["desired", "activating", "ready", "failed", "retired"] as const,
  )
    .default("desired"),
  error: t.text().nullable(),
  revision: t.integer().default(0),
  createdAt: t.datetime().defaultNow(),
  updatedAt: t.datetime().defaultNow(),
}, {
  indexes: [{ columns: ["state"] }],
});

declare module "/p/the8020/db/types.ts" {
  interface Database extends TableDatabase<typeof Packages> {}
}

export type PackageRow = Row<typeof Packages>;
export default Packages;
