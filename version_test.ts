import { assertEquals } from "@std/assert";
import { kernelInvokeSymbol } from "@the8020/kernel";
import { packageVersion } from "./version.ts";

Deno.test("package version exposes only current release metadata", async () => {
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const previous = globals[kernelInvokeSymbol];
  globals[kernelInvokeSymbol] = (
    operation: string,
    input: Record<string, unknown>,
  ) => {
    assertEquals(operation, "runtime.operation");
    assertEquals(input, {
      operation: "package.repository.inspect",
      input: { package_id: "example/app" },
    });
    return Promise.resolve({
      success: true,
      result: {
        repository: {
          head: "abc",
          clean: false,
          remote_url: "private",
          path: "private",
        },
      },
    });
  };
  try {
    assertEquals(await packageVersion("example/app"), {
      commit: "abc",
      modified: true,
    });
  } finally {
    globals[kernelInvokeSymbol] = previous;
  }
});
