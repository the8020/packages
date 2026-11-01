import { currentLocalization } from "/p/the8020/i18n/mod.ts";

/** Catalog metadata keeps its authored text when a package has no translation. */
export async function metadataText(
  packageId: string,
  key: string,
  source: string,
): Promise<string> {
  const localization = currentLocalization();
  if (!localization) return source;
  const bundle = await localization.bundle(packageId);
  return bundle.texts[key] ?? source;
}
