import { type Row, t, table, type TableDatabase } from "@the8020/db";

const Activations = table("the8020__packages__activations", {
  activationId: t.text().primaryKey(),
  stage: t.enum(
    [
      "staged",
      "schema_synchronized",
      "pre_activated",
      "code_switched",
      "post_activated",
      "complete",
      "failed",
    ] as const,
  ).default("staged"),
  error: t.text().nullable(),
  previousPackageSetHash: t.text(),
  candidatePackageSetHash: t.text(),
  startedAt: t.datetime().defaultNow(),
  updatedAt: t.datetime().defaultNow(),
  completedAt: t.datetime().nullable(),
}, {
  indexes: [{ columns: ["stage"] }],
});

declare module "@the8020/db/types" {
  interface Database extends TableDatabase<typeof Activations> {}
}

export type ActivationRow = Row<typeof Activations>;
export default Activations;
