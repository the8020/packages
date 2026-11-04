import { t, table, type TableDatabase } from "/p/the8020/db/mod.ts";

// Native synchronization owns these non-secret selections and their prior settings.
const Synchronizations = table("the8020__packages__synchronizations", {
  activationId: t.text().primaryKey(),
  packages: t.json(),
});

declare module "/p/the8020/db/types.ts" {
  interface Database extends TableDatabase<typeof Synchronizations> {}
}
export default Synchronizations;
