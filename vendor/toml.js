var __defProp = Object.defineProperty;
var __name = (target, value2) => __defProp(target, "name", { value: value2, configurable: true });

// deno:https://jsr.io/@std/toml/1.0.11/stringify.ts
function joinKeys(keys) {
  return keys.map((str) => {
    return str.length === 0 || str.match(/[^A-Za-z0-9_-]/) ? JSON.stringify(str) : str;
  }).join(".");
}
__name(joinKeys, "joinKeys");
var Dumper = class {
  static {
    __name(this, "Dumper");
  }
  maxPad = 0;
  srcObject;
  output = [];
  #arrayTypeCache = /* @__PURE__ */ new Map();
  constructor(srcObjc) {
    this.srcObject = srcObjc;
  }
  dump(fmtOptions = {}) {
    this.output = this.#printObject(this.srcObject);
    this.output = this.#format(fmtOptions);
    return this.output;
  }
  #printObject(obj, keys = []) {
    const out = [];
    const props = Object.keys(obj);
    const inlineProps = [];
    const multilineProps = [];
    for (const prop of props) {
      if (this.#isSimplySerializable(obj[prop])) {
        inlineProps.push(prop);
      } else {
        multilineProps.push(prop);
      }
    }
    const sortedProps = inlineProps.concat(multilineProps);
    for (const prop of sortedProps) {
      const value2 = obj[prop];
      if (value2 instanceof Date) {
        out.push(this.#dateDeclaration([
          prop
        ], value2));
      } else if (typeof value2 === "string" || value2 instanceof RegExp) {
        out.push(this.#strDeclaration([
          prop
        ], value2.toString()));
      } else if (typeof value2 === "number") {
        out.push(this.#numberDeclaration([
          prop
        ], value2));
      } else if (typeof value2 === "boolean") {
        out.push(this.#boolDeclaration([
          prop
        ], value2));
      } else if (value2 instanceof Array) {
        const arrayType = this.#getTypeOfArray(value2);
        if (arrayType === "ONLY_PRIMITIVE") {
          out.push(this.#arrayDeclaration([
            prop
          ], value2));
        } else if (arrayType === "ONLY_OBJECT_EXCLUDING_ARRAY") {
          for (let i = 0; i < value2.length; i++) {
            out.push("");
            out.push(this.#headerGroup([
              ...keys,
              prop
            ]));
            out.push(...this.#printObject(value2[i], [
              ...keys,
              prop
            ]));
          }
        } else {
          const str = value2.map((x) => this.#printAsInlineValue(x)).join(",");
          out.push(`${this.#declaration([
            prop
          ])}[${str}]`);
        }
      } else if (typeof value2 === "object") {
        out.push("");
        out.push(this.#header([
          ...keys,
          prop
        ]));
        if (value2) {
          const toParse = value2;
          out.push(...this.#printObject(toParse, [
            ...keys,
            prop
          ]));
        }
      }
    }
    out.push("");
    return out;
  }
  #isPrimitive(value2) {
    return value2 instanceof Date || value2 instanceof RegExp || [
      "string",
      "number",
      "boolean"
    ].includes(typeof value2);
  }
  #getTypeOfArray(arr) {
    if (this.#arrayTypeCache.has(arr)) {
      return this.#arrayTypeCache.get(arr);
    }
    const type = this.#doGetTypeOfArray(arr);
    this.#arrayTypeCache.set(arr, type);
    return type;
  }
  #doGetTypeOfArray(arr) {
    if (!arr.length) {
      return "ONLY_PRIMITIVE";
    }
    const onlyPrimitive = this.#isPrimitive(arr[0]);
    if (arr[0] instanceof Array) {
      return "MIXED";
    }
    for (let i = 1; i < arr.length; i++) {
      if (onlyPrimitive !== this.#isPrimitive(arr[i]) || arr[i] instanceof Array) {
        return "MIXED";
      }
    }
    return onlyPrimitive ? "ONLY_PRIMITIVE" : "ONLY_OBJECT_EXCLUDING_ARRAY";
  }
  #printAsInlineValue(value2) {
    if (value2 instanceof Date) {
      return `"${this.#printDate(value2)}"`;
    } else if (typeof value2 === "string" || value2 instanceof RegExp) {
      return JSON.stringify(value2.toString());
    } else if (typeof value2 === "number") {
      return value2;
    } else if (typeof value2 === "boolean") {
      return value2.toString();
    } else if (value2 instanceof Array) {
      const str = value2.map((x) => this.#printAsInlineValue(x)).join(",");
      return `[${str}]`;
    } else if (typeof value2 === "object") {
      if (!value2) {
        throw new Error("Should never reach");
      }
      const str = Object.keys(value2).map((key) => {
        return `${joinKeys([
          key
        ])} = ${this.#printAsInlineValue(value2[key])}`;
      }).join(",");
      return `{${str}}`;
    }
    throw new Error("Should never reach");
  }
  #isSimplySerializable(value2) {
    return typeof value2 === "string" || typeof value2 === "number" || typeof value2 === "boolean" || value2 instanceof RegExp || value2 instanceof Date || value2 instanceof Array && this.#getTypeOfArray(value2) !== "ONLY_OBJECT_EXCLUDING_ARRAY";
  }
  #header(keys) {
    return `[${joinKeys(keys)}]`;
  }
  #headerGroup(keys) {
    return `[[${joinKeys(keys)}]]`;
  }
  #declaration(keys) {
    const title = joinKeys(keys);
    if (title.length > this.maxPad) {
      this.maxPad = title.length;
    }
    return `${title} = `;
  }
  #arrayDeclaration(keys, value2) {
    return `${this.#declaration(keys)}${JSON.stringify(value2)}`;
  }
  #strDeclaration(keys, value2) {
    return `${this.#declaration(keys)}${JSON.stringify(value2)}`;
  }
  #numberDeclaration(keys, value2) {
    if (Number.isNaN(value2)) {
      return `${this.#declaration(keys)}nan`;
    }
    switch (value2) {
      case Infinity:
        return `${this.#declaration(keys)}inf`;
      case -Infinity:
        return `${this.#declaration(keys)}-inf`;
      default:
        return `${this.#declaration(keys)}${value2}`;
    }
  }
  #boolDeclaration(keys, value2) {
    return `${this.#declaration(keys)}${value2}`;
  }
  #printDate(value2) {
    function dtPad(v, lPad = 2) {
      return v.padStart(lPad, "0");
    }
    __name(dtPad, "dtPad");
    const m = dtPad((value2.getUTCMonth() + 1).toString());
    const d = dtPad(value2.getUTCDate().toString());
    const h = dtPad(value2.getUTCHours().toString());
    const min = dtPad(value2.getUTCMinutes().toString());
    const s = dtPad(value2.getUTCSeconds().toString());
    const ms = dtPad(value2.getUTCMilliseconds().toString(), 3);
    const fData = `${value2.getUTCFullYear()}-${m}-${d}T${h}:${min}:${s}.${ms}`;
    return fData;
  }
  #dateDeclaration(keys, value2) {
    return `${this.#declaration(keys)}${this.#printDate(value2)}`;
  }
  #format(options = {}) {
    const { keyAlignment = false } = options;
    const rDeclaration = /^(\".*\"|[^=]*)\s=/;
    const out = [];
    for (let i = 0; i < this.output.length; i++) {
      const l = this.output[i];
      if (l[0] === "[" && l[1] !== "[") {
        if (this.output[i + 1] === "" && this.output[i + 2]?.slice(0, l.length) === l.slice(0, -1) + ".") {
          i += 1;
          continue;
        }
        out.push(l);
      } else {
        if (keyAlignment) {
          const m = rDeclaration.exec(l);
          if (m && m[1]) {
            out.push(l.replace(m[1], m[1].padEnd(this.maxPad)));
          } else {
            out.push(l);
          }
        } else {
          out.push(l);
        }
      }
    }
    const cleanedOutput = [];
    for (let i = 0; i < out.length; i++) {
      const l = out[i];
      if (!(l === "" && out[i + 1] === "")) {
        cleanedOutput.push(l);
      }
    }
    return cleanedOutput;
  }
};
function stringify(obj, options) {
  return new Dumper(obj).dump(options).join("\n");
}
__name(stringify, "stringify");

// deno:https://jsr.io/@std/collections/1.3.0/deep_merge.ts
var DEFAULT_OPTIONS = {
  arrays: "merge",
  sets: "merge",
  maps: "merge"
};
function deepMerge(record, other, options) {
  return deepMergeInternal(record, other, /* @__PURE__ */ new Set(), options ?? DEFAULT_OPTIONS);
}
__name(deepMerge, "deepMerge");
function deepMergeInternal(record, other, seen, options) {
  const result = {};
  const keys = /* @__PURE__ */ new Set([
    ...getKeys(record),
    ...getKeys(other)
  ]);
  for (const key of keys) {
    if (key === "__proto__") {
      continue;
    }
    const a = record[key];
    if (!Object.hasOwn(other, key)) {
      result[key] = a;
      continue;
    }
    const b = other[key];
    if (isNonNullObject(a) && isNonNullObject(b) && !seen.has(a) && !seen.has(b)) {
      seen.add(a);
      seen.add(b);
      result[key] = mergeObjects(a, b, seen, options);
      continue;
    }
    result[key] = b;
  }
  return result;
}
__name(deepMergeInternal, "deepMergeInternal");
function mergeObjects(left, right, seen, options) {
  if (isMergeable(left) && isMergeable(right)) {
    return deepMergeInternal(left, right, seen, options);
  }
  if (isIterable(left) && isIterable(right)) {
    if (Array.isArray(left) && Array.isArray(right)) {
      if (options.arrays === "merge") {
        return left.concat(right);
      }
      return right;
    }
    if (left instanceof Map && right instanceof Map) {
      if (options.maps === "merge") {
        const result = new Map(left);
        for (const [k, v] of right) {
          result.set(k, v);
        }
        return result;
      }
      return right;
    }
    if (left instanceof Set && right instanceof Set) {
      if (options.sets === "merge") {
        const result = new Set(left);
        for (const v of right) {
          result.add(v);
        }
        return result;
      }
      return right;
    }
  }
  return right;
}
__name(mergeObjects, "mergeObjects");
function isMergeable(value2) {
  return Object.getPrototypeOf(value2) === Object.prototype;
}
__name(isMergeable, "isMergeable");
function isIterable(value2) {
  return typeof value2[Symbol.iterator] === "function";
}
__name(isIterable, "isIterable");
function isNonNullObject(value2) {
  return value2 !== null && typeof value2 === "object";
}
__name(isNonNullObject, "isNonNullObject");
function getKeys(record) {
  const keys = Object.keys(record);
  const symbols = Object.getOwnPropertySymbols(record);
  if (symbols.length === 0) return keys;
  for (const sym of symbols) {
    if (Object.prototype.propertyIsEnumerable.call(record, sym)) {
      keys.push(sym);
    }
  }
  return keys;
}
__name(getKeys, "getKeys");

// deno:https://jsr.io/@std/toml/1.0.11/_parser.ts
function isLeap(yearNumber) {
  return yearNumber % 4 === 0 && yearNumber % 100 !== 0 || yearNumber % 400 === 0;
}
__name(isLeap, "isLeap");
var Scanner = class {
  static {
    __name(this, "Scanner");
  }
  #whitespace = /[ \t]/;
  #position = 0;
  #source;
  constructor(source) {
    this.#source = source;
  }
  get position() {
    return this.#position;
  }
  get source() {
    return this.#source;
  }
  /**
   * Get current character
   * @param index - relative index from current position
   */
  char(index = 0) {
    return this.#source[this.#position + index] ?? "";
  }
  /**
   * Get sliced string
   * @param start - start position relative from current position
   * @param end - end position relative from current position
   */
  slice(start, end) {
    return this.#source.slice(this.#position + start, this.#position + end);
  }
  /**
   * Move position to next
   */
  next(count = 1) {
    this.#position += count;
  }
  skipWhitespaces() {
    while (this.#whitespace.test(this.char()) && !this.eof()) {
      this.next();
    }
    if (!this.isCurrentCharEOL() && /\s/.test(this.char())) {
      const escaped = "\\u" + this.char().charCodeAt(0).toString(16);
      const position = this.#position;
      throw new SyntaxError(`Cannot parse the TOML: It contains invalid whitespace at position '${position}': \`${escaped}\``);
    }
  }
  nextUntilChar(options = {
    skipComments: true
  }) {
    while (!this.eof()) {
      const char = this.char();
      if (this.#whitespace.test(char) || this.isCurrentCharEOL()) {
        this.next();
      } else if (options.skipComments && this.char() === "#") {
        while (!this.isCurrentCharEOL() && !this.eof()) {
          this.next();
        }
      } else {
        break;
      }
    }
  }
  /**
   * Position reached EOF or not
   */
  eof() {
    return this.#position >= this.#source.length;
  }
  isCurrentCharEOL() {
    return this.char() === "\n" || this.startsWith("\r\n");
  }
  startsWith(searchString) {
    return this.#source.startsWith(searchString, this.#position);
  }
  match(regExp) {
    if (!regExp.sticky) {
      throw new Error(`RegExp ${regExp} does not have a sticky 'y' flag`);
    }
    regExp.lastIndex = this.#position;
    return this.#source.match(regExp);
  }
};
function success(body) {
  return {
    ok: true,
    body
  };
}
__name(success, "success");
function failure() {
  return {
    ok: false
  };
}
__name(failure, "failure");
function unflat(keys, values = {
  __proto__: null
}) {
  return keys.reduceRight((acc, key) => ({
    [key]: acc
  }), values);
}
__name(unflat, "unflat");
function isObject(value2) {
  return typeof value2 === "object" && value2 !== null;
}
__name(isObject, "isObject");
function getTargetValue(target, keys) {
  const key = keys[0];
  if (!key) {
    throw new Error("Cannot parse the TOML: key length is not a positive number");
  }
  return target[key];
}
__name(getTargetValue, "getTargetValue");
function deepAssignTable(target, table2) {
  const { keys, type, value: value2 } = table2;
  const currentValue = getTargetValue(target, keys);
  if (currentValue === void 0) {
    return Object.assign(target, unflat(keys, value2));
  }
  if (Array.isArray(currentValue)) {
    const last = currentValue.at(-1);
    deepAssign(last, {
      type,
      keys: keys.slice(1),
      value: value2
    });
    return target;
  }
  if (isObject(currentValue)) {
    deepAssign(currentValue, {
      type,
      keys: keys.slice(1),
      value: value2
    });
    return target;
  }
  throw new Error("Unexpected assign");
}
__name(deepAssignTable, "deepAssignTable");
function deepAssignTableArray(target, table2) {
  const { type, keys, value: value2 } = table2;
  const currentValue = getTargetValue(target, keys);
  if (currentValue === void 0) {
    return Object.assign(target, unflat(keys, [
      value2
    ]));
  }
  if (Array.isArray(currentValue)) {
    if (table2.keys.length === 1) {
      currentValue.push(value2);
    } else {
      const last = currentValue.at(-1);
      deepAssign(last, {
        type: table2.type,
        keys: table2.keys.slice(1),
        value: table2.value
      });
    }
    return target;
  }
  if (isObject(currentValue)) {
    deepAssign(currentValue, {
      type,
      keys: keys.slice(1),
      value: value2
    });
    return target;
  }
  throw new Error("Unexpected assign");
}
__name(deepAssignTableArray, "deepAssignTableArray");
function deepAssign(target, body) {
  switch (body.type) {
    case "Block":
      return deepMerge(target, body.value);
    case "Table":
      return deepAssignTable(target, body);
    case "TableArray":
      return deepAssignTableArray(target, body);
  }
}
__name(deepAssign, "deepAssign");
function or(parsers) {
  return (scanner) => {
    for (const parse2 of parsers) {
      const result = parse2(scanner);
      if (result.ok) return result;
    }
    return failure();
  };
}
__name(or, "or");
function join(parser, separator) {
  const Separator = character(separator);
  return (scanner) => {
    const out = [];
    const first = parser(scanner);
    if (!first.ok) return success(out);
    out.push(first.body);
    while (!scanner.eof()) {
      if (!Separator(scanner).ok) break;
      const result = parser(scanner);
      if (!result.ok) {
        throw new SyntaxError(`Invalid token after "${separator}"`);
      }
      out.push(result.body);
    }
    return success(out);
  };
}
__name(join, "join");
function join1(parser, separator) {
  const Separator = character(separator);
  return (scanner) => {
    const first = parser(scanner);
    if (!first.ok) return failure();
    const out = [
      first.body
    ];
    while (!scanner.eof()) {
      if (!Separator(scanner).ok) break;
      const result = parser(scanner);
      if (!result.ok) {
        throw new SyntaxError(`Invalid token after "${separator}"`);
      }
      out.push(result.body);
    }
    return success(out);
  };
}
__name(join1, "join1");
function kv(keyParser, separator, valueParser) {
  const Separator = character(separator);
  return (scanner) => {
    const position = scanner.position;
    const key = keyParser(scanner);
    if (!key.ok) return failure();
    const sep = Separator(scanner);
    if (!sep.ok) {
      throw new SyntaxError(`key/value pair doesn't have "${separator}"`);
    }
    const value2 = valueParser(scanner);
    if (!value2.ok) {
      const lineEndIndex = scanner.source.indexOf("\n", scanner.position);
      const endPosition = lineEndIndex > 0 ? lineEndIndex : scanner.source.length;
      const line = scanner.source.slice(position, endPosition);
      throw new SyntaxError(`Cannot parse value on line '${line}'`);
    }
    return success(unflat(key.body, value2.body));
  };
}
__name(kv, "kv");
function merge(parser) {
  return (scanner) => {
    const result = parser(scanner);
    if (!result.ok) return failure();
    let body = {
      __proto__: null
    };
    for (const record of result.body) {
      if (typeof record === "object" && record !== null) {
        body = deepMerge(body, record);
      }
    }
    return success(body);
  };
}
__name(merge, "merge");
function repeat(parser) {
  return (scanner) => {
    const body = [];
    while (!scanner.eof()) {
      const result = parser(scanner);
      if (!result.ok) break;
      body.push(result.body);
      scanner.nextUntilChar();
    }
    if (body.length === 0) return failure();
    return success(body);
  };
}
__name(repeat, "repeat");
function surround(left, parser, right) {
  const Left = character(left);
  const Right = character(right);
  return (scanner) => {
    if (!Left(scanner).ok) {
      return failure();
    }
    const result = parser(scanner);
    if (!result.ok) {
      throw new SyntaxError(`Invalid token after "${left}"`);
    }
    if (!Right(scanner).ok) {
      throw new SyntaxError(`Not closed by "${right}" after started with "${left}"`);
    }
    return success(result.body);
  };
}
__name(surround, "surround");
function character(str) {
  return (scanner) => {
    scanner.skipWhitespaces();
    if (!scanner.startsWith(str)) return failure();
    scanner.next(str.length);
    scanner.skipWhitespaces();
    return success(void 0);
  };
}
__name(character, "character");
var BARE_KEY_REGEXP = /[A-Za-z0-9_-]+/y;
function bareKey(scanner) {
  scanner.skipWhitespaces();
  const key = scanner.match(BARE_KEY_REGEXP)?.[0];
  if (!key) return failure();
  scanner.next(key.length);
  return success(key);
}
__name(bareKey, "bareKey");
function escapeSequence(scanner) {
  if (scanner.char() !== "\\") return failure();
  scanner.next();
  switch (scanner.char()) {
    case "b":
      scanner.next();
      return success("\b");
    case "t":
      scanner.next();
      return success("	");
    case "n":
      scanner.next();
      return success("\n");
    case "f":
      scanner.next();
      return success("\f");
    case "r":
      scanner.next();
      return success("\r");
    case "u":
    case "U": {
      const codePointLen = scanner.char() === "u" ? 4 : 6;
      const codePoint = parseInt("0x" + scanner.slice(1, 1 + codePointLen), 16);
      const str = String.fromCodePoint(codePoint);
      scanner.next(codePointLen + 1);
      return success(str);
    }
    case '"':
      scanner.next();
      return success('"');
    case "\\":
      scanner.next();
      return success("\\");
    default:
      throw new SyntaxError(`Invalid escape sequence: \\${scanner.char()}`);
  }
}
__name(escapeSequence, "escapeSequence");
function basicString(scanner) {
  scanner.skipWhitespaces();
  if (scanner.char() !== '"') return failure();
  scanner.next();
  const acc = [];
  while (scanner.char() !== '"' && !scanner.eof()) {
    if (scanner.char() === "\n") {
      throw new SyntaxError("Single-line string cannot contain EOL");
    }
    const escapedChar = escapeSequence(scanner);
    if (escapedChar.ok) {
      acc.push(escapedChar.body);
    } else {
      acc.push(scanner.char());
      scanner.next();
    }
  }
  if (scanner.eof()) {
    throw new SyntaxError(`Single-line string is not closed:
${acc.join("")}`);
  }
  scanner.next();
  return success(acc.join(""));
}
__name(basicString, "basicString");
function literalString(scanner) {
  scanner.skipWhitespaces();
  if (scanner.char() !== "'") return failure();
  scanner.next();
  const acc = [];
  while (scanner.char() !== "'" && !scanner.eof()) {
    if (scanner.char() === "\n") {
      throw new SyntaxError("Single-line string cannot contain EOL");
    }
    acc.push(scanner.char());
    scanner.next();
  }
  if (scanner.eof()) {
    throw new SyntaxError(`Single-line string is not closed:
${acc.join("")}`);
  }
  scanner.next();
  return success(acc.join(""));
}
__name(literalString, "literalString");
function multilineBasicString(scanner) {
  scanner.skipWhitespaces();
  if (!scanner.startsWith('"""')) return failure();
  scanner.next(3);
  if (scanner.char() === "\n") {
    scanner.next();
  } else if (scanner.startsWith("\r\n")) {
    scanner.next(2);
  }
  const acc = [];
  while (!scanner.startsWith('"""') && !scanner.eof()) {
    if (scanner.startsWith("\\\n")) {
      scanner.next();
      scanner.nextUntilChar({
        skipComments: false
      });
      continue;
    } else if (scanner.startsWith("\\\r\n")) {
      scanner.next();
      scanner.nextUntilChar({
        skipComments: false
      });
      continue;
    }
    const escapedChar = escapeSequence(scanner);
    if (escapedChar.ok) {
      acc.push(escapedChar.body);
    } else {
      acc.push(scanner.char());
      scanner.next();
    }
  }
  if (scanner.eof()) {
    throw new SyntaxError(`Multi-line string is not closed:
${acc.join("")}`);
  }
  if (scanner.char(3) === '"') {
    acc.push('"');
    scanner.next();
  }
  scanner.next(3);
  return success(acc.join(""));
}
__name(multilineBasicString, "multilineBasicString");
function multilineLiteralString(scanner) {
  scanner.skipWhitespaces();
  if (!scanner.startsWith("'''")) return failure();
  scanner.next(3);
  if (scanner.char() === "\n") {
    scanner.next();
  } else if (scanner.startsWith("\r\n")) {
    scanner.next(2);
  }
  const acc = [];
  while (!scanner.startsWith("'''") && !scanner.eof()) {
    acc.push(scanner.char());
    scanner.next();
  }
  if (scanner.eof()) {
    throw new SyntaxError(`Multi-line string is not closed:
${acc.join("")}`);
  }
  if (scanner.char(3) === "'") {
    acc.push("'");
    scanner.next();
  }
  scanner.next(3);
  return success(acc.join(""));
}
__name(multilineLiteralString, "multilineLiteralString");
var BOOLEAN_REGEXP = /(?:true|false)\b/y;
function boolean(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(BOOLEAN_REGEXP);
  if (!match) return failure();
  const string = match[0];
  scanner.next(string.length);
  const value2 = string === "true";
  return success(value2);
}
__name(boolean, "boolean");
var INFINITY_MAP = /* @__PURE__ */ new Map([
  [
    "inf",
    Infinity
  ],
  [
    "+inf",
    Infinity
  ],
  [
    "-inf",
    -Infinity
  ]
]);
var INFINITY_REGEXP = /[+-]?inf\b/y;
function infinity(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(INFINITY_REGEXP);
  if (!match) return failure();
  const string = match[0];
  scanner.next(string.length);
  const value2 = INFINITY_MAP.get(string);
  return success(value2);
}
__name(infinity, "infinity");
var NAN_REGEXP = /[+-]?nan\b/y;
function nan(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(NAN_REGEXP);
  if (!match) return failure();
  const string = match[0];
  scanner.next(string.length);
  const value2 = NaN;
  return success(value2);
}
__name(nan, "nan");
var dottedKey = join1(or([
  bareKey,
  basicString,
  literalString
]), ".");
var BINARY_REGEXP = /0b[01]+(?:_[01]+)*\b/y;
function binary(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(BINARY_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  const value2 = match.slice(2).replaceAll("_", "");
  const number = parseInt(value2, 2);
  return isNaN(number) ? failure() : success(number);
}
__name(binary, "binary");
var OCTAL_REGEXP = /0o[0-7]+(?:_[0-7]+)*\b/y;
function octal(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(OCTAL_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  const value2 = match.slice(2).replaceAll("_", "");
  const number = parseInt(value2, 8);
  return isNaN(number) ? failure() : success(number);
}
__name(octal, "octal");
var HEX_REGEXP = /0x[0-9a-f]+(?:_[0-9a-f]+)*\b/yi;
function hex(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(HEX_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  const value2 = match.slice(2).replaceAll("_", "");
  const number = parseInt(value2, 16);
  return isNaN(number) ? failure() : success(number);
}
__name(hex, "hex");
var INTEGER_REGEXP = /[+-]?(?:0|[1-9][0-9]*(?:_[0-9]+)*)\b/y;
function integer(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(INTEGER_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  const value2 = match.replaceAll("_", "");
  const int = parseInt(value2, 10);
  return success(int);
}
__name(integer, "integer");
var FLOAT_REGEXP = /[+-]?(?:0|[1-9][0-9]*(?:_[0-9]+)*)(?:\.[0-9]+(?:_[0-9]+)*)?(?:e[+-]?[0-9]+(?:_[0-9]+)*)?\b/yi;
function float(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(FLOAT_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  const value2 = match.replaceAll("_", "");
  const float2 = parseFloat(value2);
  if (isNaN(float2)) return failure();
  return success(float2);
}
__name(float, "float");
var DATE_TIME_REGEXP = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?:[ 0-9TZ.:+-]+)?\b/y;
function dateTime(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(DATE_TIME_REGEXP);
  if (!match) return failure();
  const string = match[0];
  scanner.next(string.length);
  const groups = match.groups;
  if (groups.month == "02") {
    const days = parseInt(groups.day);
    if (days > 29) {
      throw new SyntaxError(`Invalid date string "${match}"`);
    }
    const year = parseInt(groups.year);
    if (days > 28 && !isLeap(year)) {
      throw new SyntaxError(`Invalid date string "${match}"`);
    }
  }
  const date = new Date(string.trim());
  if (isNaN(date.getTime())) {
    throw new SyntaxError(`Invalid date string "${match}"`);
  }
  return success(date);
}
__name(dateTime, "dateTime");
var LOCAL_TIME_REGEXP = /(\d{2}):(\d{2}):(\d{2})(?:\.[0-9]+)?\b/y;
function localTime(scanner) {
  scanner.skipWhitespaces();
  const match = scanner.match(LOCAL_TIME_REGEXP)?.[0];
  if (!match) return failure();
  scanner.next(match.length);
  return success(match);
}
__name(localTime, "localTime");
function arrayValue(scanner) {
  scanner.skipWhitespaces();
  if (scanner.char() !== "[") return failure();
  scanner.next();
  const array = [];
  while (!scanner.eof()) {
    scanner.nextUntilChar();
    const result = value(scanner);
    if (!result.ok) break;
    array.push(result.body);
    scanner.skipWhitespaces();
    if (scanner.char() !== ",") break;
    scanner.next();
  }
  scanner.nextUntilChar();
  if (scanner.char() !== "]") throw new SyntaxError("Array is not closed");
  scanner.next();
  return success(array);
}
__name(arrayValue, "arrayValue");
function inlineTable(scanner) {
  scanner.nextUntilChar();
  if (scanner.char(1) === "}") {
    scanner.next(2);
    return success({
      __proto__: null
    });
  }
  const pairs = surround("{", join(pair, ","), "}")(scanner);
  if (!pairs.ok) return failure();
  let table2 = {
    __proto__: null
  };
  for (const pair2 of pairs.body) {
    table2 = deepMerge(table2, pair2);
  }
  return success(table2);
}
__name(inlineTable, "inlineTable");
var value = or([
  multilineBasicString,
  multilineLiteralString,
  basicString,
  literalString,
  boolean,
  infinity,
  nan,
  dateTime,
  localTime,
  binary,
  octal,
  hex,
  float,
  integer,
  arrayValue,
  inlineTable
]);
var pair = kv(dottedKey, "=", value);
function block(scanner) {
  scanner.nextUntilChar();
  const result = merge(repeat(pair))(scanner);
  if (result.ok) return success({
    type: "Block",
    value: result.body
  });
  return failure();
}
__name(block, "block");
var tableHeader = surround("[", dottedKey, "]");
function table(scanner) {
  scanner.nextUntilChar();
  const header = tableHeader(scanner);
  if (!header.ok) return failure();
  scanner.nextUntilChar();
  const b = block(scanner);
  return success({
    type: "Table",
    keys: header.body,
    value: b.ok ? b.body.value : {
      __proto__: null
    }
  });
}
__name(table, "table");
var tableArrayHeader = surround("[[", dottedKey, "]]");
function tableArray(scanner) {
  scanner.nextUntilChar();
  const header = tableArrayHeader(scanner);
  if (!header.ok) return failure();
  scanner.nextUntilChar();
  const b = block(scanner);
  return success({
    type: "TableArray",
    keys: header.body,
    value: b.ok ? b.body.value : {
      __proto__: null
    }
  });
}
__name(tableArray, "tableArray");
function toml(scanner) {
  const blocks = repeat(or([
    block,
    tableArray,
    table
  ]))(scanner);
  if (!blocks.ok) return success({
    __proto__: null
  });
  const body = blocks.body.reduce(deepAssign, {
    __proto__: null
  });
  return success(body);
}
__name(toml, "toml");
function createParseErrorMessage(scanner, message) {
  const string = scanner.source.slice(0, scanner.position);
  const lines = string.split("\n");
  const row = lines.length;
  const column = lines.at(-1)?.length ?? 0;
  return `Parse error on line ${row}, column ${column}: ${message}`;
}
__name(createParseErrorMessage, "createParseErrorMessage");
function parserFactory(parser) {
  return (tomlString) => {
    const scanner = new Scanner(tomlString);
    try {
      const result = parser(scanner);
      if (result.ok && scanner.eof()) return result.body;
      const message = `Unexpected character: "${scanner.char()}"`;
      throw new SyntaxError(createParseErrorMessage(scanner, message));
    } catch (error) {
      if (error instanceof Error) {
        throw new SyntaxError(createParseErrorMessage(scanner, error.message));
      }
      const message = "Invalid error type caught";
      throw new SyntaxError(createParseErrorMessage(scanner, message));
    }
  };
}
__name(parserFactory, "parserFactory");

// deno:https://jsr.io/@std/toml/1.0.11/parse.ts
function parse(tomlString) {
  return parserFactory(toml)(tomlString);
}
__name(parse, "parse");
export {
  parse,
  stringify
};
