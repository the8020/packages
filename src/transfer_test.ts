import { assert, assertEquals, assertRejects } from "@std/assert";
import type {
  PackageIndex,
  PackageSourceInspection,
  PackageVersions,
} from "@the8020/kernel";
import type { TransferApi } from "./transfer.ts";

const { exportPackageList, importPackageList, packageListFile, previewImport } =
  await import("./transfer.ts");

const c = (n: number) => n.toString(16).padStart(40, "0");

interface FakePackage {
  index: Partial<PackageIndex>;
  remote?: string;
  remoteId?: string;
  references?: PackageSourceInspection["references"];
  history?: [string, string[]][];
}

function fakeApi(packages: Record<string, FakePackage>) {
  const calls: string[] = [];
  const bySource = (source: string) =>
    Object.entries(packages).find(([, item]) => item.remote === source);
  const api = {
    index: {
      list: () =>
        Promise.resolve(
          Object.entries(packages).map(([id, item]) =>
            ({ package_id: id, local: false, ...item.index }) as PackageIndex
          ),
        ),
      inspect: (id: string) =>
        Promise.resolve(
          {
            package_id: id,
            local: false,
            ...packages[id]!.index,
          } as PackageIndex,
        ),
      set: (input: Record<string, unknown>) => {
        calls.push(`set ${JSON.stringify(input)}`);
        return Promise.resolve({} as PackageIndex);
      },
    },
    repository: {
      inspect: (id: string) =>
        Promise.resolve({ remote_url: packages[id]!.remote }),
      fetch: (id: string) => {
        calls.push(`fetch ${id}`);
        return Promise.resolve({});
      },
    },
    source: {
      inspect: (source: string) => {
        const [id, item] = bySource(source) ?? [];
        if (!id || !item) return Promise.reject(new Error("unreachable"));
        const packageId = item.remoteId ?? id;
        const [author, repository] = packageId.split("/");
        return Promise.resolve({
          source,
          author,
          repository,
          package_id: packageId,
          references: item.references ?? [],
        } as PackageSourceInspection);
      },
    },
    versions: {
      list: (id: string) =>
        Promise.resolve({
          package_id: id,
          versions: (packages[id]!.history ?? []).map(([commit, parents]) => ({
            commit,
            parents,
          })),
        } as PackageVersions),
    },
    synchronize: (ids: string[]) => {
      calls.push(`synchronize ${ids.join(",")}`);
      return Promise.resolve(
        ids.map((id) => ({
          package_id: id,
          commit: "",
          success: id !== "acme/broken",
          error: id === "acme/broken" ? "hook failed" : undefined,
        })),
      );
    },
  } as unknown as TransferApi;
  return { api, calls };
}

const verified: Record<string, FakePackage> = {
  "acme/tagged": {
    index: { active_commit: c(2), secret: "git" },
    remote: "https://git.example/acme/tagged.git",
    references: [
      { kind: "branch", name: "main", commit: c(3) },
      { kind: "tag", name: "1.0.0", commit: c(2) },
    ],
    history: [[c(3), [c(2)]], [c(2), [c(1)]]],
  },
  "acme/ancestor": {
    index: { active_commit: c(5), local: true },
    remote: "https://git.example/acme/ancestor.git",
    references: [{ kind: "branch", name: "main", commit: c(7) }],
    history: [[c(7), [c(6)]], [c(6), [c(5)]], [c(5), []]],
  },
};

Deno.test("export pins verified running commits and exact tags", async () => {
  const { api, calls } = fakeApi(verified);
  const result = await exportPackageList(
    ["acme/tagged", "acme/ancestor"],
    api,
  );
  assertEquals(result.problems, []);
  assertEquals(result.file, {
    schema: 1,
    packages: [
      {
        package: "acme/tagged",
        source: "https://git.example/acme/tagged.git",
        commit: c(2),
        tag: "1.0.0",
        secret: "git",
      },
      {
        package: "acme/ancestor",
        source: "https://git.example/acme/ancestor.git",
        commit: c(5),
      },
    ],
  });
  assertEquals(calls, ["fetch acme/tagged", "fetch acme/ancestor"]);
  packageListFile.parse(result.file);
});

Deno.test("any unverifiable package withholds the whole export", async () => {
  const { api } = fakeApi({
    ...verified,
    "acme/ahead": {
      index: { active_commit: c(9) },
      remote: "https://git.example/acme/ahead.git",
      references: [{ kind: "branch", name: "main", commit: c(8) }],
      history: [[c(9), [c(8)]], [c(8), []]],
    },
    "acme/noremote": { index: { active_commit: c(1) } },
    "acme/inactive": { index: {}, remote: "https://git.example/x/y.git" },
  });
  const result = await exportPackageList(
    [
      "acme/tagged",
      "acme/ahead",
      "acme/noremote",
      "acme/inactive",
    ],
    api,
  );
  assertEquals(result.file, undefined);
  assertEquals(result.problems, [
    {
      package: "acme/ahead",
      code: "not_in_remote",
      detail: c(9),
      source: "https://git.example/acme/ahead.git",
    },
    { package: "acme/noremote", code: "no_remote" },
    { package: "acme/inactive", code: "not_active" },
  ]);
});

Deno.test("import file rejects duplicates and unknown fields", () => {
  const entry = {
    package: "acme/a",
    source: "https://git.example/acme/a.git",
    commit: c(1),
  };
  assert(
    !packageListFile.safeParse({ schema: 1, packages: [entry, entry] })
      .success,
  );
  assert(
    !packageListFile.safeParse({
      schema: 1,
      packages: [{ ...entry, branch: "main" }],
    }).success,
  );
  assert(!packageListFile.safeParse({ schema: 2, packages: [entry] }).success);
});

const list = (...packages: Record<string, string>[]) =>
  packageListFile.parse({ schema: 1, packages });

Deno.test("import preview compares with the desired index", async () => {
  const { api } = fakeApi({
    "acme/same": {
      index: {
        source: "https://git.example/acme/same.git",
        active_commit: c(1),
      },
    },
    "acme/other": {
      index: {
        source: "https://git.example/acme/other.git",
        active_commit: c(1),
        tag: "1.0.0",
      },
    },
    "acme/local": { index: { local: true, active_commit: c(4) } },
  });
  const preview = await previewImport(
    list(
      {
        package: "acme/same",
        source: "https://git.example/acme/same.git",
        commit: c(1),
      },
      {
        package: "acme/other",
        source: "https://git.example/acme/other.git",
        commit: c(2),
      },
      {
        package: "acme/local",
        source: "https://git.example/acme/local.git",
        commit: c(4),
      },
      {
        package: "acme/new",
        source: "https://git.example/acme/new.git",
        commit: c(3),
      },
    ),
    api,
  );
  assertEquals(
    preview.map((item) => [item.package, item.state, item.current]),
    [
      ["acme/same", "same", "0000000"],
      ["acme/other", "different", "1.0.0"],
      ["acme/local", "local", "0000000"],
      ["acme/new", "new", undefined],
    ],
  );
});

Deno.test("import keeps different versions unless overwrite is chosen", async () => {
  const packages: Record<string, FakePackage> = {
    "acme/other": {
      index: {
        source: "https://git.example/acme/other.git",
        active_commit: c(1),
      },
      remote: "https://git.example/acme/other.git",
      references: [{ kind: "tag", name: "2.0.0", commit: c(2) }],
    },
    "acme/new": {
      index: { state: "retired" } as Partial<PackageIndex>,
      remote: "https://git.example/acme/new.git",
      references: [{ kind: "tag", name: "1.0.0", commit: c(9) }],
    },
  };
  const file = list(
    {
      package: "acme/other",
      source: "https://git.example/acme/other.git",
      commit: c(2),
      tag: "2.0.0",
    },
    {
      package: "acme/new",
      source: "https://git.example/acme/new.git",
      commit: c(3),
      tag: "1.0.0",
      secret: "git",
    },
  );
  const first = fakeApi(packages);
  const kept = await importPackageList(file, {}, first.api);
  assertEquals(kept.map((item) => [item.outcome, item.code]), [
    ["skipped", "different"],
    ["imported", undefined],
  ]);
  // The moved tag no longer names the exported commit, so the commit is pinned.
  assertEquals(first.calls, [
    `set ${
      JSON.stringify({
        author: "acme",
        repository: "new",
        source: "https://git.example/acme/new.git",
        commit: c(3),
        secret: "git",
      })
    }`,
  ]);
  const second = fakeApi(packages);
  const replaced = await importPackageList(
    file,
    { overwrite: true, packages: ["acme/other"], install: true },
    second.api,
  );
  assertEquals(replaced.map((item) => [item.outcome, item.code]), [
    ["imported", undefined],
    ["skipped", "not_selected"],
  ]);
  assertEquals(second.calls, [
    `set ${
      JSON.stringify({
        author: "acme",
        repository: "other",
        source: "https://git.example/acme/other.git",
        tag: "2.0.0",
      })
    }`,
    "synchronize acme/other",
  ]);
});

Deno.test("import keeps the listed name and reports local and installation failures", async () => {
  const { api, calls } = fakeApi({
    "acme/Casing": {
      index: { state: "retired" } as Partial<PackageIndex>,
      remote: "https://git.example/acme/casing.git",
      remoteId: "acme/casing",
    },
    "acme/local": { index: { local: true } },
    "acme/broken": {
      index: { state: "retired" } as Partial<PackageIndex>,
      remote: "https://git.example/acme/broken.git",
    },
  });
  const outcomes = await importPackageList(
    list(
      {
        package: "acme/Casing",
        source: "https://git.example/acme/casing.git",
        commit: c(1),
      },
      {
        package: "acme/local",
        source: "https://git.example/acme/local.git",
        commit: c(1),
      },
      {
        package: "acme/broken",
        source: "https://git.example/acme/broken.git",
        commit: c(1),
      },
    ),
    { install: true },
    api,
  );
  assertEquals(
    outcomes.map((item) => [item.outcome, item.code, item.detail]),
    [
      ["imported", undefined, undefined],
      ["failed", "local", undefined],
      ["failed", "install", "hook failed"],
    ],
  );
  // The Git URL derives another name; the listed one is the target.
  assert(calls.includes(`set ${
    JSON.stringify({
      author: "acme",
      repository: "Casing",
      source: "https://git.example/acme/casing.git",
      commit: c(1),
    })
  }`));
  assertEquals(calls.at(-1), "synchronize acme/Casing,acme/broken");
});

Deno.test("export requires at least one package", async () => {
  await assertRejects(() => exportPackageList([], fakeApi({}).api), RangeError);
});
