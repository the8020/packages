import {
  kernel,
  type ProgramSummary as ExecutableProgram,
} from "@the8020/kernel";
// Public modules load under the importing package's map.
// deno-lint-ignore no-import-prefix
import { parse } from "npm:smol-toml@1.8.0";

export interface ProgramManifest {
  schema: 1;
  description: string;
  entrypoint: string;
  defaultLayout?: string;
  discoverable: boolean;
  uui: boolean;
}

export interface ProgramMetadata {
  description: string;
  discoverable: boolean;
  uui: boolean;
  default_layout?: string;
  metadata_error?: string;
}

export interface ProgramSummary extends ExecutableProgram, ProgramMetadata {}

/** Read application metadata alongside the native ready-executable catalog. */
export async function listPrograms(): Promise<ProgramSummary[]> {
  const programs = await kernel.programs.list();
  const result: ProgramSummary[] = [];
  for (const program of programs) {
    result.push({ ...program, ...await readProgramMetadata(program) });
  }
  return result;
}

/** Metadata failures leave executable identity and native diagnostics intact. */
export async function readProgramMetadata(
  program: Pick<ExecutableProgram, "entrypoint" | "entrypoint_url">,
): Promise<ProgramMetadata> {
  try {
    if (!safeRelativePath(program.entrypoint)) {
      throw new TypeError("invalid program entrypoint");
    }
    const path = new URL(
      `${"../".repeat(program.entrypoint.split("/").length - 1)}program.toml`,
      program.entrypoint_url,
    );
    if (path.protocol !== "file:") {
      throw new TypeError("invalid program source");
    }
    const manifest = await readProgramManifest(path);
    return {
      description: manifest.description,
      discoverable: manifest.discoverable,
      uui: manifest.uui,
      ...(manifest.defaultLayout
        ? { default_layout: manifest.defaultLayout }
        : {}),
    };
  } catch (error) {
    return {
      description: "",
      discoverable: false,
      uui: false,
      metadata_error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function readProgramManifest(
  path: string | URL,
): Promise<ProgramManifest> {
  const info = await Deno.lstat(path);
  if (!info.isFile || info.isSymlink) {
    throw new TypeError(`invalid program manifest ${path}`);
  }
  using file = await Deno.open(path);
  const bytes = new Uint8Array(16 * 1024);
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const count = await file.read(bytes);
    if (count === null) break;
    size += count;
    if (size > 1024 * 1024) {
      throw new TypeError(`program manifest exceeds 1 MiB: ${path}`);
    }
    text += decoder.decode(bytes.subarray(0, count), { stream: true });
  }
  text += decoder.decode();
  let source: Record<string, unknown>;
  try {
    source = parse(text, { integersAsBigInt: true });
  } catch (cause) {
    throw new TypeError(`invalid program manifest ${path}`, { cause });
  }
  const {
    schema,
    description,
    entrypoint: declaredEntrypoint = "program.ts",
    default_layout: defaultLayout,
    discoverable = true,
    uui = false,
  } = source;
  const entrypoint = declaredEntrypoint === ""
    ? "program.ts"
    : declaredEntrypoint;
  if (
    schema !== 1n || typeof description !== "string" ||
    description.trim().length === 0 || typeof entrypoint !== "string" ||
    !safeRelativePath(entrypoint) || typeof discoverable !== "boolean" ||
    typeof uui !== "boolean" ||
    (defaultLayout !== undefined &&
      (typeof defaultLayout !== "string" ||
        (defaultLayout !== "" && !safeRelativePath(defaultLayout)))) ||
    Object.keys(source).some((key) =>
      ![
        "schema",
        "description",
        "entrypoint",
        "default_layout",
        "discoverable",
        "uui",
      ].includes(key)
    )
  ) {
    throw new TypeError(`invalid program manifest ${path}`);
  }
  return {
    schema: 1,
    description,
    entrypoint,
    defaultLayout: defaultLayout || undefined,
    discoverable,
    uui,
  };
}

const segmentPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function validSegment(value: string): boolean {
  return value !== "." && value !== ".." && segmentPattern.test(value);
}

function safeRelativePath(value: string): boolean {
  return value.length > 0 && !value.startsWith("/") && !value.includes("\\") &&
    !value.includes("\0") &&
    value.split("/").every((part) => validSegment(part));
}
