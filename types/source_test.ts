import { assert, assertEquals } from "@std/assert";
import {
  field,
  fieldMetadata,
  type ValueHelpPage,
} from "/p/the8020/db/fields.ts";
import { installedVersion, repositoryFields, sourceVersion } from "./source.ts";

const values = (page: ValueHelpPage | undefined) =>
  page && ({ rows: page.rows, more: page.more });

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
  assertEquals(
    values(
      await help({
        query: { search: " TAG ", filters: {}, sort: null },
        offset: 1,
        limit: 1,
      }),
    ),
    {
      rows: [{ value: "tag:v2", label: "Tag v2" }],
      more: false,
    },
  );
  assertEquals(
    (await help({
      query: { search: "", filters: {}, sort: null },
      offset: 0,
      limit: 2,
    })).more,
    true,
  );
  assertEquals(
    values(
      await fieldMetadata(second)?.valueHelp?.({
        query: { search: "", filters: {}, sort: null },
        offset: 0,
        limit: 1,
      }),
    ),
    {
      rows: [{ value: "latest", label: "Latest default branch" }],
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
    values(
      await fieldMetadata(versions)?.valueHelp?.({
        query: { search: "connection", filters: {}, sort: null },
        offset: 0,
        limit: 1,
      }),
    ),
    {
      rows: [{ value: "commit:abc", label: "abc — Fix connection" }],
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
    values(
      await fieldMetadata(repository.shape.branch)?.valueHelp?.({
        query: { search: "REMOTE", filters: {}, sort: null },
        offset: 0,
        limit: 1,
      }),
    ),
    {
      rows: [{ value: "stable", label: "stable (remote)" }],
      more: false,
    },
  );
});
