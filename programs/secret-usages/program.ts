import { text } from "/p/the8020/i18n/mod.ts";
import { msg } from "/p/the8020/packages/i18n/messages.ts";
import Packages from "../../tables/packages.ts";

/** Secret usages for `the8020/secrets`: repository credentials of packages. */
export default async function secretUsages(names: string[]) {
  if (!Array.isArray(names) || names.length === 0) return [];
  const rows = await Packages.select([Packages.packageId, Packages.secretName])
    .where(Packages.secretName, "in", names)
    .where(Packages.state, "!=", "retired")
    .orderBy(Packages.packageId).limit(1000).execute();
  return rows.map((row) => ({
    secret: row.secretName!,
    title: text(msg("secret_usages.package_id", { id: row.packageId })),
    detail: text(msg("secret_usages.repository_credentials")),
    open: {
      program: "the8020/admin-core/packages",
      arguments: [row.packageId],
    },
  }));
}
