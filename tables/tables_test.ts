import { assertEquals } from "@std/assert";
import { kernelDatabaseBackendSymbol } from "@the8020/kernel";

(globalThis as unknown as Record<symbol, unknown>)[
  kernelDatabaseBackendSymbol
] = "sqlite";
const { descriptorOf } = await import("@the8020/db");
const ActivationPackages = (await import("./activation_packages.ts")).default;
const Activations = (await import("./activations.ts")).default;
const HookRuns = (await import("./hook_runs.ts")).default;
const Packages = (await import("./packages.ts")).default;

Deno.test("package state tables preserve batch and hook identities", () => {
  assertEquals(Packages.table, "the8020__packages__packages");
  assertEquals(
    descriptorOf(ActivationPackages).primary_key,
    ["activationId", "packageId"],
  );
  assertEquals(
    descriptorOf(HookRuns).primary_key,
    ["activationId", "packageId", "hook"],
  );
  assertEquals(descriptorOf(Activations).columns[0]?.name, "activationId");
});
