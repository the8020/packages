import { assertEquals, assertThrows } from "@std/assert";
import { AdminCommandError } from "@the8020/kernel";
import { parseCommandArguments, requiredCommandArgument } from "./commands.ts";

Deno.test("package command argument helpers return structured failures", () => {
  for (
    const action of [
      () => requiredCommandArgument([], 0, "service ID"),
      () => parseCommandArguments(["--unknown"], { values: ["known"] }),
    ]
  ) {
    try {
      action();
      throw new Error("invalid arguments unexpectedly succeeded");
    } catch (error) {
      assertEquals(error instanceof AdminCommandError, true);
      assertEquals((error as AdminCommandError).code, "invalid_arguments");
    }
  }
});

Deno.test("command arguments preserve positionals and validate flags", () => {
  assertEquals(
    parseCommandArguments([
      " leading ",
      "--name=value",
      "--confirm=false",
      "--",
      "--literal",
    ], { values: ["name"], booleans: ["confirm"] }),
    {
      positionals: [" leading ", "--literal"],
      options: { name: "value", confirm: false },
    },
  );
  assertEquals(
    parseCommandArguments(["--name", "value", "--confirm"], {
      values: ["name"],
      booleans: ["confirm"],
    }).options,
    { name: "value", confirm: true },
  );
  for (
    const arguments_ of [["--name"], ["--name=a", "--name=b"], [
      "--confirm=maybe",
    ]]
  ) {
    const error = assertThrows(
      () =>
        parseCommandArguments(arguments_, {
          values: ["name"],
          booleans: ["confirm"],
        }),
      AdminCommandError,
    );
    assertEquals(error.code, "invalid_arguments");
  }
  assertEquals(
    requiredCommandArgument([" unchanged "], 0, "value"),
    " unchanged ",
  );
});
