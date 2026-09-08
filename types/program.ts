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

export const programInfo = z.object({
  name: field(z.string(), {
    label: "Name",
    description: "The short program name within its package.",
  }),
  kind: field(z.string(), {
    label: "Runs as",
    description:
      "Interactive programs open a screen; background jobs run without an interactive screen. Unavailable programs cannot run.",
  }),
  description: field(z.string(), {
    label: "Description",
    description: "What this program does and when to run it.",
  }),
  uui: field(z.boolean(), {
    label: "Interactive",
    description:
      "Whether this program can present screens in the current UUI session.",
  }),
  discoverable: field(z.boolean(), {
    label: "Listed on Home",
    description: "Whether an interactive program appears in the Home catalog.",
  }),
  defaultLayout: field(z.string(), {
    label: "Default layout",
    description: "The layout declared for this program.",
  }),
});
