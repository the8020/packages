import { field, z } from "/p/the8020/db/fields.ts";

export const programId: z.ZodString = field(z.string(), {
  label: "Program",
  description:
    "Choose a program to run. **Interactive** programs open a screen; **background** programs run as jobs.",
  valueHelp: async ({ query, offset, limit }) => {
    const { kernel } = await import("@the8020/kernel");
    const search = query.trim().toLowerCase();
    const programs = (await kernel.programs.list()).filter((program) =>
      `${program.program_id} ${program.description ?? ""}`.toLowerCase()
        .includes(search)
    ).sort((left, right) => left.program_id.localeCompare(right.program_id));
    return {
      items: programs.slice(offset, offset + limit).map((program) => ({
        value: program.program_id,
        label: program.description || program.name,
        description: `${program.program_id} · ${
          program.uui ? "Interactive" : "Background"
        }`,
      })),
      more: programs.length > offset + limit,
    };
  },
  open: async (value) => {
    const { default: programs } = await import(
      "/p/the8020/admin-core/programs/programs/program.ts"
    );
    await programs(value);
  },
});
