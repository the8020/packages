const MAX_FILES = 5000;
const MAX_BYTES = 1048576;
const SOURCE = /\.[cm]?[jt]sx?$/;
/** Tests and their fixtures, scenarios and end-to-end scripts. */
const TEST_ONLY = /(?:[._]test|_e2e|_fixture|_scenarios|_bench)\.[cm]?[jt]sx?$/;
const SKIPPED = new Set([".git", "node_modules", "public"]);
const SPECIFIER = /\b(?:from|import)\s*\(?\s*["']\/p\/([^"'\n]+)["']/g;
const SEGMENT = "[A-Za-z0-9][A-Za-z0-9._-]*";
const PACKAGE = new RegExp(`^(${SEGMENT}/${SEGMENT})/`);
/** Canonical `namespace/package` ID usable as a path below the packages root. */
export const PACKAGE_ID = new RegExp(`^${SEGMENT}/${SEGMENT}$`);

/**
 * Packages whose `/p/<namespace>/<package>/` modules a package's code imports.
 * Test files are ignored; computed dynamic imports are not detected.
 */
export async function importedPackages(
  root: string,
  self?: string,
): Promise<string[]> {
  const result = new Set<string>();
  const pending = [root];
  let files = 0;
  while (pending.length) {
    const directory = pending.pop()!;
    for await (const entry of Deno.readDir(directory)) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory) {
        if (!SKIPPED.has(entry.name)) pending.push(path);
        continue;
      }
      if (
        !entry.isFile || !SOURCE.test(entry.name) || TEST_ONLY.test(entry.name)
      ) continue;
      if (++files > MAX_FILES) {
        throw new RangeError(`More than ${MAX_FILES} source files.`);
      }
      if ((await Deno.stat(path)).size > MAX_BYTES) continue;
      for (
        const [, specifier] of (await Deno.readTextFile(path)).matchAll(
          SPECIFIER,
        )
      ) {
        const id = PACKAGE.exec(specifier!)?.[1];
        if (id && id !== self) result.add(id);
      }
    }
  }
  return [...result].sort();
}
