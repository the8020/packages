import { assertEquals, assertThrows } from "@std/assert";
import {
  AdminCommandError,
  type KernelInvoke,
  kernelInvokeSymbol,
} from "@the8020/kernel";
import remove from "../programs/delete/program.ts";

Deno.test("package delete requires an ID and explicit confirmation", async () => {
  const calls: unknown[] = [];
  (globalThis as unknown as Record<symbol, unknown>)[kernelInvokeSymbol] =
    ((operation, input) => {
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
  } finally {
    delete (globalThis as unknown as Record<symbol, unknown>)[
      kernelInvokeSymbol
    ];
  }
});
