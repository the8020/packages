import { assertEquals } from "@std/assert";
import { DatabaseSync } from "node:sqlite";
import {
  kernelDatabaseBackendSymbol,
  type KernelInvoke,
  kernelInvokeSymbol,
} from "@the8020/kernel";
import { createTableSQL } from "/p/the8020/db/internal/ddl.ts";

const globals = globalThis as unknown as Record<symbol, unknown>;
globals[kernelDatabaseBackendSymbol] = "sqlite";
const { descriptorOf } = await import("/p/the8020/db/mod.ts");
const { default: Packages } = await import("../tables/packages.ts");
const { default: secretUsages } = await import("./secret-usages/program.ts");

Deno.test("secret usages report non-retired packages using a repository credential", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(createTableSQL("sqlite", descriptorOf(Packages)));
  globals[kernelInvokeSymbol] = ((operation, args) => {
    if (operation !== "database.execute") throw new Error(operation);
    const statement = database.prepare(String(args.statement));
    const parameters = (args.parameters as unknown[]).map((value) =>
      typeof value === "boolean"
        ? Number(value)
        : value !== null && typeof value === "object"
        ? String((value as { value: unknown }).value)
        : value as string | number | null
    );
    if (!args.return_rows) {
      statement.run(...parameters);
      return Promise.resolve({ columns: [], rows: [] });
    }
    const rows = statement.all(...parameters);
    const columns = statement.columns().map((column) => column.name);
    return Promise.resolve({
      columns,
      rows: rows.map((row) => columns.map((column) => row[column])),
    });
  }) satisfies KernelInvoke;
  try {
    for (
      const [repository, secret, state] of [
        ["app", "github", "ready"],
        ["lib", "gitlab", "ready"],
        ["old", "github", "retired"],
        ["local", null, "ready"],
      ] as const
    ) {
      await Packages.insert({
        packageId: `acme/${repository}`,
        author: "acme",
        repository,
        secretName: secret,
        state,
      }).execute();
    }
    assertEquals(await secretUsages(["github"]), [{
      secret: "github",
      title: "Package acme/app",
      detail: "Repository credentials",
      open: { program: "the8020/admin-core/packages", arguments: ["acme/app"] },
    }]);
    assertEquals(
      (await secretUsages(["github", "gitlab"])).map((usage) => usage.secret),
      ["github", "gitlab"],
    );
    assertEquals(await secretUsages([]), []);
  } finally {
    delete globals[kernelInvokeSymbol];
    database.close();
  }
});
