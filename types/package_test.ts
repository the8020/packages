import { assertEquals, assertNotEquals } from "@std/assert";
import { fieldMetadata } from "/p/the8020/db/fields.ts";
import {
  defaultConfiguration,
  Localization,
  text,
  withLocalization,
} from "/p/the8020/i18n/mod.ts";
import { metadataText } from "../localization.ts";
import english from "../i18n/locales/en.json" with { type: "json" };
import czech from "../i18n/locales/cs.json" with { type: "json" };
import { packageInfo } from "./package.ts";
import { programInfo } from "./program.ts";

Deno.test("manifest descriptions and shared field captions have separate translation keys", async () => {
  for (
    const [language, catalog, label] of [["en", english, "Description"], [
      "cs",
      czech,
      "Popis",
    ]] as const
  ) {
    await withLocalization(
      new Localization(
        language,
        defaultConfiguration,
        (packageId) =>
          Promise.resolve({
            package: packageId,
            language,
            texts: catalog.texts,
          }),
      ),
      async () => {
        const description = await metadataText(
          "the8020/packages",
          "package.description",
          "Package catalog",
        );
        assertNotEquals(description, label);
        assertEquals(
          text(fieldMetadata(packageInfo.shape.description)?.label),
          label,
        );
        assertEquals(
          text(fieldMetadata(programInfo.shape.description)?.label),
          label,
        );
      },
    );
  }
});
