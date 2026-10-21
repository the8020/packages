import { assertEquals, assertRejects } from "@std/assert";
import { authDatabase } from "/p/the8020/auth/src/test_support.ts";

Deno.test("package reads require view per package ID", async () => {
  const fixture = await authDatabase();
  const { packages, viewablePackages } = await import("./admin.ts");
  const users = await import("/p/the8020/users/src/admin.ts");
  const auth = await import("/p/the8020/auth/src/admin.ts");
  try {
    await users.add("alice");
    await auth.createRole({
      name: "alice",
      description: "",
      permissions: { "the8020.packages.package.view": "acme/*" },
    });
    fixture.asUser("alice");
    assertEquals(
      (await viewablePackages([
        { package_id: "acme/tools" },
        { package_id: "the8020/users" },
      ])).map((row) => row.package_id),
      ["acme/tools"],
    );
    for (
      const read of [
        () => packages.inspect("the8020/users"),
        () => packages.index.inspect("the8020/users"),
        () => packages.repository.inspect("the8020/users"),
        () => packages.repository.status("the8020/users"),
        () => packages.versions.list("the8020/users"),
      ]
    ) await assertRejects(read, Error, "Permission denied");
  } finally {
    fixture.close();
  }
});
