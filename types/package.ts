import { field, z } from "/p/the8020/db/fields.ts";

export const packageId: z.ZodString = field(z.string(), {
  label: "Package",
  description:
    "Open a package to see its programs, services, and installed version.",
  valueHelp: async ({ query, offset, limit }) => {
    const { default: Packages } = await import("../tables/packages.ts");
    const { sql } = await import("/p/the8020/db/mod.ts");
    const rows = await Packages.select([Packages.packageId, Packages.state])
      .where(
        sql<string>`lower(${sql.ref(Packages.packageId)})`,
        "like",
        `%${query.trim().toLowerCase()}%`,
      )
      .orderBy(Packages.packageId).offset(offset).limit(limit + 1).execute();
    return {
      items: rows.slice(0, limit).map((row) => ({
        value: row.packageId,
        label: row.packageId,
        description: row.state.charAt(0).toUpperCase() + row.state.slice(1),
      })),
      more: rows.length > limit,
    };
  },
  open: async (value) => {
    const { default: packages } = await import(
      "/p/the8020/admin-core/programs/packages/program.ts"
    );
    await packages(value);
  },
});
