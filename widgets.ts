// @deno-types="./vendor/smol-toml.ts"
import { parse } from "./vendor/smol-toml.js";

/** One `widgets/<name>.toml` declaration of a Home tile. */
export interface Widget {
  /** `namespace/package/name`, from the declaring package and file name. */
  id: string;
  package: string;
  title: string;
  description: string;
  icon?: string;
  /** Category key path such as `administration/packages`. */
  category?: string;
  order: number;
  open: WidgetProgram;
  /** Optional live status, read by a non-interactive program. */
  data?: WidgetProgram & { refresh?: number };
  /**
   * Who sees the tile: users with the action for any value, or explicitly
   * everyone signed in. Without it the tile is public too, but platform tiles
   * must say so. Hiding is not enforcement.
   */
  visible?: { permission: string } | { public: true };
}

/** A program call: `namespace/package/program` with string arguments. */
export interface WidgetProgram {
  program: string;
  arguments: string[];
}

/** One category from a package's `widgets/categories.toml`. */
export interface WidgetCategory {
  key: string;
  title: string;
  icon?: string;
  order?: number;
}

export interface WidgetProblem {
  path: string;
  message: string;
}

export interface WidgetCatalog {
  widgets: Widget[];
  /** Merged by key; the first package in ID order defines each value. */
  categories: WidgetCategory[];
  problems: WidgetProblem[];
}

const MAX_FILE_BYTES = 64 * 1024;
const MAX_FILES_PER_PACKAGE = 256;
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const CATEGORY = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/;
const ICON = /^[a-z0-9_]{1,64}$/;
/** An exact declared action; patterns belong only in roles. */
const ACTION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,511}$/;

/** Read every installed package's widget declarations without loading code. */
export async function readWidgets(
  packagesRoot = "/workspace/packages",
): Promise<WidgetCatalog> {
  const catalog: WidgetCatalog = { widgets: [], categories: [], problems: [] };
  const categories = new Map<string, WidgetCategory>();
  for (const packageId of await packageIds(packagesRoot)) {
    const root = `${packagesRoot}/${packageId}/widgets`;
    let names: string[];
    try {
      names = [];
      for await (const entry of Deno.readDir(root)) {
        if (entry.isFile && entry.name.endsWith(".toml")) {
          names.push(entry.name);
        }
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) continue;
      throw error;
    }
    names.sort();
    if (names.length > MAX_FILES_PER_PACKAGE) {
      catalog.problems.push({
        path: root,
        message: `more than ${MAX_FILES_PER_PACKAGE} widget files`,
      });
      names = names.slice(0, MAX_FILES_PER_PACKAGE);
    }
    for (const name of names) {
      const path = `${root}/${name}`;
      try {
        const text = await readBoundedText(path);
        if (name === "categories.toml") {
          for (const category of parseWidgetCategories(text)) {
            mergeCategory(categories, category);
          }
        } else {
          catalog.widgets.push(
            parseWidget(text, `${packageId}/${name.slice(0, -5)}`),
          );
        }
      } catch (error) {
        catalog.problems.push({
          path,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  catalog.categories = [...categories.values()].sort((a, b) =>
    a.key.localeCompare(b.key)
  );
  return catalog;
}

export function parseWidget(text: string, id: string): Widget {
  const parts = id.split("/");
  if (parts.length !== 3 || !parts.every((part) => SEGMENT.test(part))) {
    throw new TypeError("widget ID must be namespace/package/name");
  }
  const source = parseToml(text);
  allowOnly(source, [
    "schema",
    "title",
    "description",
    "icon",
    "category",
    "order",
    "open",
    "data",
    "visible",
  ], "widget");
  if (source.schema !== 1n) throw new TypeError("widget schema must be 1");
  const open = table(source.open, "open");
  allowOnly(open, ["program", "arguments"], "open");
  let data: Widget["data"];
  if (source.data !== undefined) {
    const entry = table(source.data, "data");
    allowOnly(entry, ["program", "arguments", "refresh"], "data");
    data = programCall(entry, "data");
    if (entry.refresh !== undefined) {
      const refresh = order(entry.refresh, "data.refresh");
      if (refresh < 10 || refresh > 3600) {
        throw new TypeError("data.refresh must be 10–3600 seconds");
      }
      data.refresh = refresh;
    }
  }
  let visible: Widget["visible"];
  if (source.visible !== undefined) {
    const entry = table(source.visible, "visible");
    allowOnly(entry, ["permission", "public"], "visible");
    if (entry.public !== undefined) {
      if (entry.public !== true || entry.permission !== undefined) {
        throw new TypeError(
          "visible.public must be true and exclude visible.permission",
        );
      }
      visible = { public: true };
    } else if (
      typeof entry.permission !== "string" || !ACTION.test(entry.permission)
    ) {
      throw new TypeError("visible.permission must be an exact action name");
    } else {
      visible = { permission: entry.permission };
    }
  }
  return {
    id,
    package: parts.slice(0, 2).join("/"),
    title: boundedText(source.title, "title", 60),
    description: source.description === undefined
      ? ""
      : boundedText(source.description, "description", 200),
    ...(source.icon === undefined ? {} : { icon: icon(source.icon, "icon") }),
    ...(source.category === undefined
      ? {}
      : { category: categoryKey(source.category, "category") }),
    order: order(source.order ?? 0n, "order"),
    open: programCall(open, "open"),
    ...(data === undefined ? {} : { data }),
    ...(visible === undefined ? {} : { visible }),
  };
}

export function parseWidgetCategories(text: string): WidgetCategory[] {
  const source = parseToml(text);
  return Object.entries(source).map(([key, value]) => {
    categoryKey(key, "category");
    const entry = table(value, key);
    allowOnly(entry, ["title", "icon", "order"], key);
    return {
      key,
      title: boundedText(entry.title, `${key}.title`, 60),
      ...(entry.icon === undefined
        ? {}
        : { icon: icon(entry.icon, `${key}.icon`) }),
      ...(entry.order === undefined
        ? {}
        : { order: order(entry.order, `${key}.order`) }),
    };
  });
}

function programCall(
  entry: Record<string, unknown>,
  label: string,
): WidgetProgram {
  const program = boundedText(entry.program, `${label}.program`, 200);
  if (
    program.split("/").length !== 3 ||
    !program.split("/").every((part) => SEGMENT.test(part))
  ) throw new TypeError(`${label}.program must be namespace/package/program`);
  const args = entry.arguments ?? [];
  if (
    !Array.isArray(args) || args.length > 32 ||
    !args.every((value) => typeof value === "string" && value.length <= 1000)
  ) throw new TypeError(`${label}.arguments must be at most 32 strings`);
  return { program, arguments: args as string[] };
}

function mergeCategory(
  categories: Map<string, WidgetCategory>,
  category: WidgetCategory,
): void {
  const existing = categories.get(category.key);
  if (existing === undefined) {
    categories.set(category.key, category);
    return;
  }
  if (existing.icon === undefined && category.icon !== undefined) {
    existing.icon = category.icon;
  }
  if (existing.order === undefined && category.order !== undefined) {
    existing.order = category.order;
  }
}

async function packageIds(root: string): Promise<string[]> {
  const ids: string[] = [];
  for await (const namespace of Deno.readDir(root)) {
    if (!namespace.isDirectory || !SEGMENT.test(namespace.name)) continue;
    for await (const repository of Deno.readDir(`${root}/${namespace.name}`)) {
      if (repository.isDirectory && SEGMENT.test(repository.name)) {
        ids.push(`${namespace.name}/${repository.name}`);
      }
    }
  }
  return ids.sort();
}

async function readBoundedText(path: string): Promise<string> {
  const info = await Deno.lstat(path);
  if (!info.isFile || info.isSymlink) {
    throw new TypeError("widget declaration must be a regular file");
  }
  if (info.size > MAX_FILE_BYTES) {
    throw new TypeError(`widget declaration exceeds ${MAX_FILE_BYTES} bytes`);
  }
  return await Deno.readTextFile(path);
}

function parseToml(text: string): Record<string, unknown> {
  try {
    return parse(text, { integersAsBigInt: true }) as Record<string, unknown>;
  } catch (cause) {
    throw new TypeError(
      `invalid TOML: ${cause instanceof Error ? cause.message : cause}`,
    );
  }
}

function allowOnly(
  value: Record<string, unknown>,
  keys: string[],
  label: string,
): void {
  const unknown = Object.keys(value).find((key) => !keys.includes(key));
  if (unknown !== undefined) {
    throw new TypeError(`unknown ${label} key ${unknown}`);
  }
}

function table(value: unknown, label: string): Record<string, unknown> {
  if (
    typeof value !== "object" || value === null || Array.isArray(value) ||
    value instanceof Date
  ) throw new TypeError(`${label} must be a table`);
  return value as Record<string, unknown>;
}

function boundedText(value: unknown, label: string, maximum: number): string {
  if (
    typeof value !== "string" || value.trim() === "" || value.length > maximum
  ) {
    throw new TypeError(`${label} must be text of 1–${maximum} characters`);
  }
  return value.trim();
}

function icon(value: unknown, label: string): string {
  if (typeof value !== "string" || !ICON.test(value)) {
    throw new TypeError(`${label} must be a Material Symbols name`);
  }
  return value;
}

function categoryKey(value: unknown, label: string): string {
  if (typeof value !== "string" || !CATEGORY.test(value)) {
    throw new TypeError(
      `${label} must be lowercase key segments separated by /`,
    );
  }
  return value;
}

function order(value: unknown, label: string): number {
  if (
    typeof value !== "bigint" || value < -1_000_000n || value > 1_000_000n
  ) throw new TypeError(`${label} must be an integer`);
  return Number(value);
}
