import { type Row, t, table, type TableDatabase } from "@the8020/db";

const HookRuns = table("the8020__packages__hook_runs", {
  activationId: t.text().primaryKey(),
  packageId: t.text().primaryKey(),
  hook: t.enum(["pre-activate", "post-activate"] as const).primaryKey(),
  state: t.enum(["pending", "running", "succeeded", "failed"] as const)
    .default("pending"),
  attempts: t.integer().default(0),
  error: t.text().nullable(),
  startedAt: t.datetime().nullable(),
  completedAt: t.datetime().nullable(),
});

declare module "@the8020/db/types" {
  interface Database extends TableDatabase<typeof HookRuns> {}
}

export type HookRunRow = Row<typeof HookRuns>;
export default HookRuns;
