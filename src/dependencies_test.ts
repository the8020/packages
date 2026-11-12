import { assertEquals } from "@std/assert";
import { importedPackages } from "./dependencies.ts";

Deno.test("dependencies come from /p/ imports outside tests", async () => {
  const root = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${root}/src`);
    await Deno.mkdir(`${root}/.git`);
    await Deno.writeTextFile(
      `${root}/mod.ts`,
      [
        'import { a } from "/p/acme/log/mod.ts";',
        'export * from "/p/acme/mail/src/send.ts";',
        'import "/p/acme/self/side.ts";',
        'const lazy = () => import("/p/acme/lazy/mod.ts");',
        'import local from "./src/local.ts";',
      ].join("\n"),
    );
    await Deno.writeTextFile(
      `${root}/src/local.ts`,
      'import type { T } from "/p/acme/types/mod.ts";',
    );
    await Deno.writeTextFile(
      `${root}/src/local_test.ts`,
      'import "/p/acme/testing/mod.ts";',
    );
    await Deno.writeTextFile(
      `${root}/browser_e2e.ts`,
      'import "/p/acme/browser/mod.ts";',
    );
    await Deno.writeTextFile(
      `${root}/.git/hook.ts`,
      'import "/p/acme/git/mod.ts";',
    );
    assertEquals(await importedPackages(root, "acme/self"), [
      "acme/lazy",
      "acme/log",
      "acme/mail",
      "acme/types",
    ]);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
