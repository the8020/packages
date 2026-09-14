import { assertEquals, assertRejects } from "@std/assert";
import { listPrograms, readProgramManifest } from "./programs.ts";
import {
  type KernelInvoke,
  kernelInvokeSymbol,
  type ProgramSummary,
} from "@the8020/kernel";
import { packages } from "./src/admin.ts";

Deno.test("program manifests parse TOML and reject invalid UUI flags", async () => {
  const root = await Deno.makeTempDir({ prefix: "the8020-manifest-test-" });
  const path = `${root}/program.toml`;
  try {
    for (
      const [flag, expected] of [["", false], ["uui = false", false], [
        "uui = true # Interactive",
        true,
      ]] as const
    ) {
      await Deno.writeTextFile(
        path,
        `schema = 1\ndescription = 'Example' # Description\n${flag}\n`,
      );
      const manifest = await readProgramManifest(path);
      assertEquals(manifest.uui, expected);
      assertEquals(manifest.description, "Example");
    }
    await Deno.writeTextFile(
      path,
      'schema = 1\ndescription = "Default entrypoint"\nentrypoint = ""\n',
    );
    assertEquals((await readProgramManifest(path)).entrypoint, "program.ts");
    await Deno.writeTextFile(
      path,
      'schema = 1.0\ndescription = "Invalid schema type"\n',
    );
    await assertRejects(
      () => readProgramManifest(path),
      TypeError,
      "invalid program manifest",
    );
    for (
      const flag of [
        'uui = "true"',
        "uui = 1",
        "uui = true\nuui = false",
        "uui = yes",
        "unknown = true",
      ]
    ) {
      await Deno.writeTextFile(
        path,
        `schema = 1\ndescription = "Example"\n${flag}\n`,
      );
      await assertRejects(
        () => readProgramManifest(path),
        TypeError,
        "invalid program manifest",
      );
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("application catalog reads metadata without loading code or changing native validity", async () => {
  const root = await Deno.makeTempDir({ prefix: "the8020-program-metadata-" });
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const previous = globals[kernelInvokeSymbol];
  try {
    const definitions: ProgramSummary[] = [];
    for (const name of ["interactive", "broken", "background"]) {
      const directory = `${root}/${name}`;
      await Deno.mkdir(`${directory}/nested`, { recursive: true });
      await Deno.writeTextFile(
        `${directory}/nested/main.ts`,
        'throw new Error("catalog must not import programs");',
      );
      await Deno.writeTextFile(
        `${directory}/program.toml`,
        name === "broken"
          ? 'schema = 1\ndescription = "Broken"\nuui = "invalid"\n'
          : `schema = 1\ndescription = "${name}"\nentrypoint = "nested/main.ts"\nuui = ${
            name === "interactive"
          }\ndiscoverable = false\ndefault_layout = "layouts/main.json"\n`,
      );
      definitions.push({
        program_id: `acme/tools/${name}`,
        package_id: "acme/tools",
        name,
        commit: "native-commit",
        entrypoint: "nested/main.ts",
        entrypoint_url: new URL(`file://${directory}/nested/main.ts`).href,
      });
    }
    const calls: string[] = [];
    globals[kernelInvokeSymbol] = ((_operation, input) => {
      const operation = String(input.operation);
      calls.push(operation);
      if (operation === "program.list") {
        return Promise.resolve({
          success: true,
          result: structuredClone(definitions),
        });
      }
      if (operation === "package.inspect") {
        return Promise.resolve({
          success: true,
          result: {
            package: {
              package_id: "acme/tools",
              path: "/host/path/not-mounted",
              valid: true,
              programs: [
                ...definitions.map((program) => ({
                  ...program,
                  path: `programs/${program.name}`,
                  valid: true,
                })),
                {
                  program_id: "acme/tools/missing",
                  path: "programs/missing",
                  valid: false,
                  validation_errors: ["missing entrypoint"],
                },
              ],
            },
          },
        });
      }
      throw new Error(`unexpected native operation ${operation}`);
    }) satisfies KernelInvoke;
    const programs = await listPrograms();
    assertEquals(
      programs.map((program) => program.program_id),
      definitions.map((program) => program.program_id),
    );
    assertEquals(programs[0]!.description, "interactive");
    assertEquals(programs[0]!.uui, true);
    assertEquals(programs[0]!.discoverable, false);
    assertEquals(programs[0]!.default_layout, "layouts/main.json");
    assertEquals(programs[0]!.commit, "native-commit");
    assertEquals(
      programs[1]!.metadata_error?.includes("invalid program manifest"),
      true,
    );
    assertEquals(programs[2]!.uui, false);
    assertEquals(programs[2]!.metadata_error, undefined);
    const inspection = await packages.inspect("acme/tools");
    assertEquals(inspection.programs![0]!.uui, true);
    assertEquals(inspection.programs![1]!.valid, true);
    assertEquals(
      inspection.programs![1]!.metadata_error?.includes(
        "invalid program manifest",
      ),
      true,
    );
    assertEquals(inspection.programs![3]!.valid, false);
    assertEquals(inspection.programs![3]!.validation_errors, [
      "missing entrypoint",
    ]);
    assertEquals(calls, ["program.list", "package.inspect"]);
  } finally {
    globals[kernelInvokeSymbol] = previous;
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("program metadata reads reject oversized and linked manifests", async () => {
  const root = await Deno.makeTempDir();
  try {
    const path = `${root}/program.toml`;
    await Deno.writeTextFile(path, "#".repeat(1024 * 1024 + 1));
    await assertRejects(
      () => readProgramManifest(path),
      TypeError,
      "exceeds 1 MiB",
    );
    await Deno.symlink(path, `${root}/linked.toml`);
    await assertRejects(
      () => readProgramManifest(`${root}/linked.toml`),
      TypeError,
      "invalid program manifest",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
