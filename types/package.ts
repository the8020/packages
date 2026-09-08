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

export const packageInfo = z.object({
  author: field(z.string(), {
    label: "Author",
    description: "The namespace that owns the package, such as `the8020`.",
  }),
  repository: field(z.string(), {
    label: "Repository",
    description: "The package name within its author namespace.",
  }),
  description: field(z.string(), {
    label: "Description",
    description: "What this package provides and when to use it.",
  }),
  documentationUrl: field(z.string(), {
    label: "Documentation",
    description: "Where to find instructions for using this package.",
  }),
  license: field(z.string(), {
    label: "License",
    description:
      "The terms under which this package may be used and distributed.",
  }),
  valid: field(z.boolean(), {
    label: "Valid",
    description:
      "Whether the package passed inspection and its declared content can be used.",
  }),
  status: field(z.string(), {
    label: "Status",
    description: "Whether the package is ready to use or needs attention.",
  }),
  serviceCount: field(z.number().int(), {
    label: "Services",
    description: "Number of services provided by this package.",
  }),
  programCount: field(z.number().int(), {
    label: "Programs",
    description:
      "Number of programs provided by this package, including hidden programs.",
  }),
  fileCount: field(z.number().int(), {
    label: "Visible files",
    description: "Number of files included in this package inspection.",
  }),
  validation: field(z.string(), {
    label: "Validation",
    description:
      "Problems in the package declarations that must be corrected before use.",
  }),
  inspection: field(z.string(), {
    label: "Inspection",
    description:
      "Problems encountered while reading or inspecting this package.",
  }),
  issue: field(z.string(), {
    label: "Needs attention",
    description:
      "Package validation or inspection problems to resolve before using its content.",
  }),
});
