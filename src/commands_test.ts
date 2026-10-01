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
import { sourceInspect } from "./commands.ts";

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
              id: "sys-a07a0d1fa1",
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

Deno.test("source inspection forwards an optional secret name", async () => {
  const calls: unknown[] = [];
  (globalThis as unknown as Record<symbol, unknown>)[kernelInvokeSymbol] =
    ((operation, input) => {
      if (operation === "database.execute") {
        return Promise.resolve({
          columns: ["value"],
          rows: [[{
            type: "json",
            value: {
              id: "sys-a07a0d1fa1",
              name: "Test",
              role: "development",
            },
          }]],
        });
      }
      calls.push(input);
      return Promise.resolve({
        success: true,
        result: { source: { package_id: "team/private" } },
      });
    }) satisfies KernelInvoke;
  try {
    const source = "https://gitlab.example.com/group/team/private.git";
    assertThrows(() => sourceInspect(), AdminCommandError);
    await sourceInspect(source, "--secret", "gitlab");
    await sourceInspect(source);
    await sourceInspect(source, "--secret", " ");
    assertEquals(calls, [
      {
        operation: "package.source.inspect",
        input: { source, secret: "gitlab" },
      },
      { operation: "package.source.inspect", input: { source } },
      { operation: "package.source.inspect", input: { source } },
    ]);
  } finally {
    delete (globalThis as unknown as Record<symbol, unknown>)[
      kernelInvokeSymbol
    ];
  }
});
