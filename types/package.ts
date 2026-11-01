import { msg } from "/p/the8020/packages/i18n/messages.ts";
import { choiceHelp, field, z } from "/p/the8020/db/fields.ts";

export const packageId: z.ZodString = field(z.string(), {
  label: msg("package.package"),
  description: msg("package.open_a_package_to_see_its_programs"),
  valueHelp: async (request) => {
    const { default: Packages } = await import("../tables/packages.ts");
    const { lookupPage } = await import("/p/the8020/db/lookup.ts");
    return lookupPage(
      z.object({ packageId, state: packageInfo.shape.catalogState }),
      Packages.select([Packages.packageId, Packages.state]),
      request,
    );
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
    label: msg("package.author"),
    description: msg("package.the_namespace_that_owns_the_package_such"),
  }),
  repository: field(z.string(), {
    label: msg("package.repository"),
    description: msg("package.the_package_name_within_its_author_namespace"),
  }),
  description: field(z.string(), {
    label: msg("package.description_label"),
    description: msg("package.what_this_package_provides_and_when_to"),
  }),
  documentationUrl: field(z.string(), {
    label: msg("package.documentation"),
    description: msg("package.where_to_find_instructions_for_using_this"),
  }),
  license: field(z.string(), {
    label: msg("package.license"),
    description: msg("package.the_terms_under_which_this_package_may"),
  }),
  valid: field(z.boolean(), {
    label: msg("package.valid"),
    description: msg("package.whether_the_package_passed_inspection_and_its"),
  }),
  status: field(z.string(), {
    label: msg("package.status"),
    description: msg("package.whether_the_package_is_ready_to_use"),
    valueHelp: choiceHelp(z.string(), [
      msg("choices.ready"),
      msg("package.needs_attention"),
    ]),
  }),
  catalogState: field(z.string(), {
    label: msg("package.status"),
    description: msg("package.the_package_s_activation_state_in_the"),
    valueHelp: choiceHelp(z.string(), [
      "desired",
      "activating",
      "ready",
      "failed",
      "retired",
    ]),
  }),
  serviceCount: field(z.number().int(), {
    label: msg("package.services"),
    description: msg("package.number_of_services_provided_by_this_package"),
  }),
  programCount: field(z.number().int(), {
    label: msg("package.programs"),
    description: msg("package.number_of_programs_provided_by_this_package"),
  }),
  fileCount: field(z.number().int(), {
    label: msg("package.visible_files"),
    description: msg("package.number_of_files_included_in_this_package"),
  }),
  validation: field(z.string(), {
    label: msg("package.validation"),
    description: msg("package.problems_in_the_package_declarations_that_must"),
  }),
  inspection: field(z.string(), {
    label: msg("package.inspection"),
    description: msg(
      "package.problems_encountered_while_reading_or_inspecting_this",
    ),
  }),
  issue: field(z.string(), {
    label: msg("package.needs_attention"),
    description: msg(
      "package.package_validation_or_inspection_problems_to_resolve",
    ),
  }),
});
