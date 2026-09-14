import { installContextProvider } from "../../kernel/defaults/config/runtime/deno/context/runtime.ts";
import type { ExecutionContext } from "@the8020/context";
installContextProvider(() => ({ username: "system" } as ExecutionContext));
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  AdminCommandError,
  kernelDatabaseBackendSymbol,
  type KernelInvoke,
  kernelInvokeSymbol,
} from "@the8020/kernel";
import remove from "../programs/delete/program.ts";

(globalThis as unknown as Record<symbol, unknown>)[
  kernelDatabaseBackendSymbol
] = "sqlite";

Deno.test("package delete requires an ID and explicit confirmation", async () => {
  const calls: unknown[] = [];
  let role = "development";
  (globalThis as unknown as Record<symbol, unknown>)[kernelInvokeSymbol] =
    ((operation, input) => {
      if (operation === "database.execute") {
        return Promise.resolve({
          columns: ["value"],
          rows: [[{
            type: "json",
            value: {
              id: "a07a0d1f-a160-48cf-8b50-b3770129a232",
              name: "Test",
              role,
            },
          }]],
        });
      }
      calls.push({ operation, input });
      return Promise.resolve({ success: true, result: { deleted: true } });
    }) satisfies KernelInvoke;
  try {
    assertThrows(() => remove(), AdminCommandError);
    assertThrows(() => remove("acme/example"), AdminCommandError, "--confirm");
    assertThrows(
      () => remove("acme/example", "--confirm=false"),
      AdminCommandError,
    );
    assertEquals(calls, []);
    assertEquals(await remove("acme/example", "--confirm"), { deleted: true });
    assertEquals(calls, [{
      operation: "runtime.operation",
      input: {
        operation: "package.delete",
        input: { package_id: "acme/example", confirm: true },
      },
    }]);
    role = "production";
    await assertRejects(
      () => remove("acme/example", "--confirm"),
      Error,
      "development system",
    );
    assertEquals(calls.length, 1);
  } finally {
    delete (globalThis as unknown as Record<symbol, unknown>)[
      kernelInvokeSymbol
    ];
  }
});
