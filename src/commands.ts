import { packages } from "/p/the8020/packages/src/admin.ts";
import {
  AdminCommandError,
  kernel,
  parseCommandArguments,
  requiredCommandArgument,
} from "@the8020/kernel";

function packageIdentity(value: string) {
  const parts = value.split("/");
  if (parts.length !== 2 || parts.some((part) => part.length === 0)) {
    throw new AdminCommandError({
      code: "invalid_arguments",
      message: "package ID must be namespace/repository",
    });
  }
  return { author: parts[0]!, repository: parts[1]! };
}

function integer(value: string | boolean | undefined, name: string): number {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) {
    throw new AdminCommandError({
      code: "invalid_arguments",
      message: `--${name} must be an integer`,
    });
  }
  return Number(value);
}

export function list() {
  return packages.list().then((packages) => ({ packages }));
}
export function inspect(...args: string[]) {
  return packages.inspect(requiredCommandArgument(args, 0, "package ID"))
    .then((value) => ({ package: value }));
}
export function remove(...args: string[]) {
  const parsed = parseCommandArguments(args, { booleans: ["confirm"] });
  const packageId = requiredCommandArgument(
    parsed.positionals,
    0,
    "package ID",
  );
  if (parsed.options.confirm !== true) {
    throw new AdminCommandError({
      code: "invalid_arguments",
      message: "package deletion requires --confirm",
    });
  }
  return packages.delete(packageId, true).then(() => ({
    deleted: true,
  }));
}
export function indexList() {
  return packages.index.list().then((packages) => ({ packages }));
}
export function indexInspect(...args: string[]) {
  return packages.index.inspect(
    requiredCommandArgument(args, 0, "package ID"),
  )
    .then((value) => ({ package: value }));
}
export function indexSet(...args: string[]) {
  const parsed = parseCommandArguments(args, {
    values: ["source", "commit", "tag", "secret"],
    booleans: ["local"],
  });
  const identity = packageIdentity(
    requiredCommandArgument(parsed.positionals, 0, "package ID"),
  );
  return packages.index.set({
    ...identity,
    source: parsed.options.source as string | undefined,
    commit: parsed.options.commit as string | undefined,
    tag: parsed.options.tag as string | undefined,
    secret: parsed.options.secret as string | undefined,
    local: parsed.options.local === true,
  }).then((value) => ({ package: value }));
}
export function sourceInspect(...args: string[]) {
  return packages.source.inspect(
    requiredCommandArgument(args, 0, "source URL"),
  )
    .then((source) => ({ source }));
}
export function versions(...args: string[]) {
  const parsed = parseCommandArguments(args, { values: ["limit"] });
  return packages.versions.list(
    requiredCommandArgument(parsed.positionals, 0, "package ID"),
    parsed.options.limit === undefined
      ? undefined
      : integer(parsed.options.limit, "limit"),
  ).then((value) => ({ package: value }));
}
export function synchronize(...args: string[]) {
  const parsed = parseCommandArguments(args, { values: ["packages"] });
  const selected = typeof parsed.options.packages === "string"
    ? parsed.options.packages.split(",").filter(Boolean)
    : [];
  return packages.synchronize(
    selected,
    kernel.execution.optionalSecret("git-token"),
  ).then((packages) => ({
    packages,
  }));
}
export function localCreate(...args: string[]) {
  const parsed = parseCommandArguments(args, { values: ["description"] });
  const identity = packageIdentity(
    requiredCommandArgument(parsed.positionals, 0, "package ID"),
  );
  return packages.local.create({
    ...identity,
    description: parsed.options.description as string | undefined,
  }).then((value) => ({ package: value }));
}
export function repositoryList() {
  return packages.repository.list().then((repositories) => ({
    repositories,
  }));
}
export function repositoryOne(
  action: "inspect" | "status" | "pull" | "push",
  args: string[],
) {
  const packageId = requiredCommandArgument(args, 0, "package ID");
  return packages.repository[action](packageId).then((repository) => ({
    repository,
  }));
}
export function repositoryCheckout(...args: string[]) {
  const parsed = parseCommandArguments(args, { values: ["branch", "commit"] });
  return packages.repository.checkout({
    packageId: requiredCommandArgument(parsed.positionals, 0, "package ID"),
    branch: parsed.options.branch as string | undefined,
    commit: parsed.options.commit as string | undefined,
  }).then((repository) => ({ repository }));
}
export function repositoryInitialize(...args: string[]) {
  const parsed = parseCommandArguments(args, {
    values: ["author-name", "author-email", "message"],
  });
  return packages.repository.initialize({
    package_id: requiredCommandArgument(parsed.positionals, 0, "package ID"),
    author_name: parsed.options["author-name"],
    author_email: parsed.options["author-email"],
    message: parsed.options.message,
  }).then((repository) => ({ repository }));
}
export function repositoryRemote(...args: string[]) {
  const parsed = parseCommandArguments(args, { values: ["name", "url"] });
  return packages.repository.remote({
    package_id: requiredCommandArgument(parsed.positionals, 0, "package ID"),
    name: parsed.options.name,
    url: parsed.options.url,
  }).then((repository) => ({ repository }));
}
