import { AdminCommandError } from "@the8020/kernel";

export interface CommandArgumentSpec {
  values?: readonly string[];
  booleans?: readonly string[];
}

export interface ParsedCommandArguments {
  positionals: string[];
  options: Record<string, string | boolean>;
}

/** Parse package-owned command flags while preserving positional token text. */
export function parseCommandArguments(
  arguments_: readonly string[],
  spec: CommandArgumentSpec = {},
): ParsedCommandArguments {
  const valueOptions = new Set(spec.values ?? []);
  const booleanOptions = new Set(spec.booleans ?? []);
  const options: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  let parseOptions = true;
  for (let index = 0; index < arguments_.length; index++) {
    const token = arguments_[index]!;
    if (parseOptions && token === "--") {
      parseOptions = false;
      continue;
    }
    if (!parseOptions || !token.startsWith("--") || token === "--") {
      positionals.push(token);
      continue;
    }
    const option = token.slice(2);
    const equals = option.indexOf("=");
    const name = equals < 0 ? option : option.slice(0, equals);
    const inline = equals < 0 ? undefined : option.slice(equals + 1);
    if (name.length === 0 || options[name] !== undefined) {
      throw invalidArguments(`invalid or repeated option --${name}`);
    }
    if (booleanOptions.has(name)) {
      if (inline !== undefined && inline !== "true" && inline !== "false") {
        throw invalidArguments(`--${name} must be true or false`);
      }
      options[name] = inline === undefined ? true : inline === "true";
      continue;
    }
    if (!valueOptions.has(name)) {
      throw invalidArguments(`unknown option --${name}`);
    }
    const value = inline ?? arguments_[++index];
    if (value === undefined) {
      throw invalidArguments(`--${name} requires a value`);
    }
    options[name] = value;
  }
  return { positionals, options };
}

export function requiredCommandArgument(
  values: readonly string[],
  index: number,
  name: string,
): string {
  const value = values[index];
  if (value === undefined || value.length === 0) {
    throw invalidArguments(`${name} is required`);
  }
  return value;
}

function invalidArguments(message: string): AdminCommandError {
  return new AdminCommandError({ code: "invalid_arguments", message });
}
