import { type Row, t, table, type TableDatabase } from "/p/the8020/db/mod.ts";

const ActivationPackages = table("the8020__packages__activation_packages", {
  activationId: t.text().primaryKey(),
  packageId: t.text().primaryKey(),
  previousCommit: t.text().nullable(),
  candidateCommit: t.text(),
  firstActivation: t.boolean(),
});

declare module "/p/the8020/db/types.ts" {
  interface Database extends TableDatabase<typeof ActivationPackages> {}
}

export type ActivationPackageRow = Row<typeof ActivationPackages>;
export default ActivationPackages;
