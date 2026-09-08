import { assert, assertEquals } from "@std/assert";
import { field, fieldMetadata } from "/p/the8020/db/fields.ts";
import { installedVersion, repositoryFields, sourceVersion } from "./source.ts";

Deno.test("Git fields retain meaning and independent paged choices across screens", async () => {
  const first = sourceVersion({
    source: "https://github.com/example/one.git",
    author: "example",
    repository: "one",
    package_id: "example/one",
    default_branch: "main",
    references: [
      { kind: "branch", name: "main", commit: "abc" },
      { kind: "branch", name: "stable", commit: "abc" },
      { kind: "tag", name: "v1", commit: "abc" },
      { kind: "tag", name: "v2", commit: "def" },
    ],
  });
  const second = sourceVersion();
  const customized = field(first.optional(), { label: "Version to install" });
  assertEquals(fieldMetadata(first)?.label, "Version");
  assertEquals(
    fieldMetadata(customized)?.description,
    fieldMetadata(first)?.description,
  );
  const help = fieldMetadata(customized)?.valueHelp;
  assert(help);
  assertEquals(await help({ query: " TAG ", offset: 1, limit: 1 }), {
    items: [{ value: "tag:v2", label: "Tag v2" }],
    more: false,
  });
  assertEquals((await help({ query: "", offset: 0, limit: 2 })).more, true);
  assertEquals(
    await fieldMetadata(second)?.valueHelp?.({
      query: "",
      offset: 0,
      limit: 1,
    }),
    {
      items: [{ value: "latest", label: "Latest default branch" }],
      more: false,
    },
  );
  const versions = installedVersion({
    package_id: "example/one",
    current_commit: "abc",
    versions: [{
      commit: "abc",
      short_commit: "abc",
      authored_at: "2026-09-07T00:00:00Z",
      author: "Example",
      tags: ["v1"],
      current: true,
      selected: true,
      subject: "Fix connection",
    }],
  });
  assertEquals(
    await fieldMetadata(versions)?.valueHelp?.({
      query: "connection",
      offset: 0,
      limit: 1,
    }),
    {
      items: [{ value: "commit:abc", label: "abc — Fix connection" }],
      more: false,
    },
  );
  const repository = repositoryFields({
    package_id: "example/one",
    path: "/example/one",
    activation_ready: true,
    clean: true,
    status: "ready",
    branches: [{ name: "stable", commit: "abc", current: false, remote: true }],
    commits: [],
  });
  assertEquals(
    await fieldMetadata(repository.shape.branch)?.valueHelp?.({
      query: "REMOTE",
      offset: 0,
      limit: 1,
    }),
    {
      items: [{ value: "stable", label: "stable (remote)" }],
      more: false,
    },
  );
});
