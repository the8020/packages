import { z } from "/p/the8020/db/fields.ts";
import { secretName } from "/p/the8020/secrets/types/secret.ts";
import type {
  PackageIndex,
  PackageSourceReference,
  PackageVersions,
} from "@the8020/kernel";
import { packages } from "./admin.ts";

const MAX_PACKAGES = 1000;
const HISTORY_LIMIT = 1000;

/** Portable package list: exact remote commits installable on another system. */
export const packageListEntry = z.object({
  package: z.string().max(201).regex(/^[^/\s]+\/[^/\s]+$/),
  source: z.string().max(2048).regex(/^https?:\/\/\S+$/i),
  commit: z.string().regex(/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/),
  tag: z.string().min(1).max(200).optional(),
  secret: secretName.min(1).optional(),
}).strict();
export const packageListFile = z.object({
  schema: z.literal(1),
  packages: z.array(packageListEntry).min(1).max(MAX_PACKAGES),
}).strict().refine(
  (value) =>
    new Set(value.packages.map((item) => item.package)).size ===
      value.packages.length,
  "A package may occur only once.",
);
export type PackageListEntry = z.infer<typeof packageListEntry>;
export type PackageListFile = z.infer<typeof packageListFile>;

/** The subset of the authorized packages API used by transfer. */
export type TransferApi = Pick<
  typeof packages,
  "index" | "repository" | "source" | "versions" | "synchronize"
>;

export type ExportProblemCode =
  | "not_active"
  | "no_remote"
  | "not_in_remote"
  | "failed";
export interface ExportProblem {
  package: string;
  code: ExportProblemCode;
  /** Missing commit or failure message. */
  detail?: string;
}
export interface ExportResult {
  /** Present only when every requested package passed verification. */
  file?: PackageListFile;
  problems: ExportProblem[];
}

/** Whether `commit` is a remote reference or an ancestor of one. */
export function inRemote(
  commit: string,
  references: PackageSourceReference[],
  versions: PackageVersions,
): boolean {
  const parents = new Map(
    versions.versions.map((version) => [version.commit, version.parents ?? []]),
  );
  const pending = references.map((reference) => reference.commit);
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (current === commit) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    pending.push(...parents.get(current) ?? []);
  }
  return false;
}

function failure(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(
    0,
    1000,
  );
}

async function exportEntry(
  packageId: string,
  api: TransferApi,
): Promise<PackageListEntry | ExportProblem> {
  const index = await api.index.inspect(packageId);
  const commit = index.active_commit;
  if (!commit) return { package: packageId, code: "not_active" };
  const repository = await api.repository.inspect(packageId);
  if (!repository.remote_url) return { package: packageId, code: "no_remote" };
  await api.repository.fetch(packageId);
  const source = await api.source.inspect(repository.remote_url, {
    secret: index.secret,
  });
  const versions = await api.versions.list(packageId, HISTORY_LIMIT);
  if (!inRemote(commit, source.references, versions)) {
    return { package: packageId, code: "not_in_remote", detail: commit };
  }
  const tag = source.references.find((reference) =>
    reference.kind === "tag" && reference.commit === commit
  )?.name;
  return {
    package: packageId,
    source: source.source,
    commit,
    ...(tag ? { tag } : {}),
    ...(index.secret ? { secret: index.secret } : {}),
  };
}

/** Verify one package for export; failures become a `failed` problem. */
export async function verifyExportEntry(
  packageId: string,
  api: TransferApi = packages,
): Promise<PackageListEntry | ExportProblem> {
  try {
    return await exportEntry(packageId, api);
  } catch (error) {
    return { package: packageId, code: "failed", detail: failure(error) };
  }
}

/**
 * Export running versions after proving each is committed in its Git remote.
 * Any problem withholds the whole file.
 */
export async function exportPackageList(
  packageIds: string[],
  api: TransferApi = packages,
): Promise<ExportResult> {
  const ids = [...new Set(packageIds)];
  if (!ids.length || ids.length > MAX_PACKAGES) {
    throw new RangeError(`Export 1 to ${MAX_PACKAGES} packages.`);
  }
  const entries: PackageListEntry[] = [];
  const problems: ExportProblem[] = [];
  for (const packageId of ids) {
    const entry = await verifyExportEntry(packageId, api);
    if ("code" in entry) problems.push(entry);
    else entries.push(entry);
  }
  return problems.length
    ? { problems }
    : { file: { schema: 1, packages: entries }, problems };
}

/** Exportable catalog: every viewable package that is not retired. */
export async function exportablePackageIds(
  api: TransferApi = packages,
): Promise<string[]> {
  return (await api.index.list())
    .filter((row) => (row as { state?: string }).state !== "retired")
    .map((row) => row.package_id)
    .sort();
}

export type ImportState = "new" | "same" | "different" | "local";
export interface ImportPreview extends PackageListEntry {
  state: ImportState;
  /** Installed tag or short commit when the package already exists. */
  current?: string;
}

function versionLabel(index: PackageIndex): string | undefined {
  const commit = index.active_commit ?? index.commit;
  return index.tag || commit?.slice(0, 7);
}

/** Compare a list with this system's desired index without contacting remotes. */
export async function previewImport(
  file: PackageListFile,
  api: TransferApi = packages,
): Promise<ImportPreview[]> {
  const index = new Map(
    (await api.index.list())
      .filter((row) => (row as { state?: string }).state !== "retired")
      .map((row) => [row.package_id, row]),
  );
  return file.packages.map((entry) => {
    const existing = index.get(entry.package);
    if (!existing) return { ...entry, state: "new" };
    const current = versionLabel(existing);
    const state: ImportState = existing.local
      ? "local"
      : existing.source === entry.source &&
          existing.active_commit === entry.commit
      ? "same"
      : "different";
    return { ...entry, state, ...(current ? { current } : {}) };
  });
}

export type ImportOutcomeCode =
  | "same"
  | "different"
  | "not_selected"
  | "local"
  | "install"
  | "failed";
export interface ImportOutcome extends ImportPreview {
  outcome: "imported" | "skipped" | "failed";
  code?: ImportOutcomeCode;
  detail?: string;
}
export interface ImportOptions {
  /** Restrict the import to these package IDs. */
  packages?: string[];
  /** Replace packages that already exist with another source or version. */
  overwrite?: boolean;
  /** Synchronize the imported packages after writing the desired index. */
  install?: boolean;
}

async function importEntry(
  item: ImportPreview,
  api: TransferApi,
): Promise<ImportOutcome> {
  const source = await api.source.inspect(item.source, { secret: item.secret });
  // The listed package ID is the target name; the Git URL is only its source.
  const [author, repository] = item.package.split("/") as [string, string];
  // A moved or missing tag must not change the exported code: pin the commit.
  const tagged = item.tag !== undefined &&
    source.references.some((reference) =>
      reference.kind === "tag" && reference.name === item.tag &&
      reference.commit === item.commit
    );
  await api.index.set({
    author,
    repository,
    source: item.source,
    ...(tagged ? { tag: item.tag } : { commit: item.commit }),
    ...(item.secret ? { secret: item.secret } : {}),
  });
  return { ...item, outcome: "imported" };
}

/** Write the selected list entries to the desired index, optionally installing them. */
export async function importPackageList(
  file: PackageListFile,
  options: ImportOptions = {},
  api: TransferApi = packages,
): Promise<ImportOutcome[]> {
  const selected = options.packages ? new Set(options.packages) : undefined;
  const outcomes: ImportOutcome[] = [];
  for (const item of await previewImport(file, api)) {
    if (selected && !selected.has(item.package)) {
      outcomes.push({ ...item, outcome: "skipped", code: "not_selected" });
    } else if (item.state === "same") {
      outcomes.push({ ...item, outcome: "skipped", code: "same" });
    } else if (item.state === "local") {
      outcomes.push({ ...item, outcome: "failed", code: "local" });
    } else if (item.state === "different" && !options.overwrite) {
      outcomes.push({ ...item, outcome: "skipped", code: "different" });
    } else {
      try {
        outcomes.push(await importEntry(item, api));
      } catch (error) {
        outcomes.push({
          ...item,
          outcome: "failed",
          code: "failed",
          detail: failure(error),
        });
      }
    }
  }
  const imported = outcomes.filter((item) => item.outcome === "imported");
  if (options.install && imported.length) {
    let results: Awaited<ReturnType<TransferApi["synchronize"]>> = [];
    let error: string | undefined;
    try {
      results = await api.synchronize(imported.map((item) => item.package));
    } catch (cause) {
      error = failure(cause);
    }
    for (const item of imported) {
      const result = results.find((row) => row.package_id === item.package);
      if (!result?.success) {
        Object.assign(item, {
          outcome: "failed",
          code: "install",
          detail: result?.error ?? error,
        });
      }
    }
  }
  return outcomes;
}
