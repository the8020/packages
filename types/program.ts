import { msg } from "/p/the8020/packages/i18n/messages.ts";
import { choiceHelp, field, z } from "/p/the8020/db/fields.ts";

export const programId: z.ZodString = field(z.string(), {
  label: msg("program.program"),
  description: msg("program.choose_a_program_to_run_interactive_programs"),
  valueHelp: async (request) => {
    const { listPrograms } = await import("../programs.ts");
    const { queryValueHelp } = await import("/p/the8020/uui/lists.ts");
    const rows = (await listPrograms()).sort((a, b) =>
      a.program_id.localeCompare(b.program_id)
    ).map((program) => ({
      programId: program.program_id,
      description: program.description || program.name,
      uui: program.uui,
    }));
    return queryValueHelp(
      z.object({
        programId,
        description: programInfo.shape.description,
        uui: programInfo.shape.uui,
      }),
      rows,
      request,
    );
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
    label: msg("program.name"),
    description: msg("program.the_short_program_name_within_its_package"),
  }),
  kind: field(z.string(), {
    label: msg("program.runs_as"),
    description: msg(
      "program.interactive_programs_open_a_screen_background_jobs",
    ),
    valueHelp: choiceHelp(z.string(), [
      msg("program.interactive"),
      msg("choices.background_job"),
      msg("choices.unavailable"),
    ]),
  }),
  description: field(z.string(), {
    label: msg("package.description_label"),
    description: msg("program.what_this_program_does_and_when_to"),
  }),
  uui: field(z.boolean(), {
    label: msg("program.interactive"),
    description: msg("program.whether_this_program_can_present_screens_in"),
  }),
  discoverable: field(z.boolean(), {
    label: msg("program.listed_on_home"),
    description: msg("program.whether_an_interactive_program_appears_in_the"),
  }),
  metadataError: field(z.string(), {
    label: msg("program.metadata_error"),
    description: msg(
      "program.why_the_program_description_or_presentation_metadata",
    ),
  }),
  defaultLayout: field(z.string(), {
    label: msg("program.default_layout"),
    description: msg("program.the_layout_declared_for_this_program"),
  }),
});
