import { inspect } from "node:util";
import { operatorRegex } from "./odd.js";
import { string } from "./parse.js";

export const showOddValue = (x: any): string =>
  // TODO: Make better
  typeof x === "string"
    ? ansi.green(`''${ansi.clear(x)}''`)
    : ["number", "bigint"].includes(typeof x)
    ? ansi.magenta(
        (() => {
          let str = x.toString();
          if (x === Infinity || x === -Infinity)
            return str.toLowerCase();
          let i = str.toString().indexOf(".");
          if (i === -1) i = str.length;
          let n = 0;
          while (i > 0) {
            if (
              n++ % 3 === 0 &&
              n !== string.length - 1
            ) {
              str =
                str.slice(0, i) + "," + str.slice(i);
            }
            i -= 1;
          }
          return str;
        })()
      )
    : Array.isArray(x)
    ? `[ ${x.map(showOddValue).join(", ")} ]`.replace(
        "[  ]",
        "[]"
      )
    : typeof x === "function"
    ? (() => {
        let name = x.name ? x.name : ansi.italic("ƒ");
        if (
          new RegExp(
            `^(?:${operatorRegex.source})$`,
            operatorRegex.flags
          ).test(name)
        ) {
          name = `(${name})`;
        }
        return ansi.cyan(name);
      })()
    : x.constructor === Object
    ? `{ ${Object.entries(x)
        .map(entry =>
          entry
            .map(showOddValue)
            .join(ansi.magenta(" = "))
        )
        .join(", ")} }`.replace("{  }", "{}")
    : typeof x === "boolean"
    ? ansi.magenta(x.toString())
    : typeof x === "symbol"
    ? ansi.magenta(x.description!)
    : x.toString();

export const log = <T>(x: T) => {
  console.log(
    inspect(x, {
      depth: Infinity,
      colors: true,
      compact: false,
    })
  );
  return x;
};

export const ansi = {
  black: (string: string) =>
    "\x1b[30m" + string + "\x1b[0m",
  red: (string: string) =>
    "\x1b[31m" + string + "\x1b[0m",
  green: (string: string) =>
    "\x1b[32m" + string + "\x1b[0m",
  gold: (string: string) =>
    "\x1b[33m" + string + "\x1b[0m",
  blue: (string: string) =>
    "\x1b[34m" + string + "\x1b[0m",
  magenta: (string: string) =>
    "\x1b[35m" + string + "\x1b[0m",
  cyan: (string: string) =>
    "\x1b[36m" + string + "\x1b[0m",
  white: (string: string) =>
    "\x1b[37m" + string + "\x1b[0m",
  grey: (string: string) =>
    "\x1b[90m" + string + "\x1b[0m",
  rose: (string: string) =>
    "\x1b[91m" + string + "\x1b[0m",
  lime: (string: string) =>
    "\x1b[92m" + string + "\x1b[0m",
  yellow: (string: string) =>
    "\x1b[93m" + string + "\x1b[0m",
  bold: (string: string) =>
    "\x1b[1m" + string + "\x1b[0m",
  dim: (string: string) =>
    "\x1b[2m" + string + "\x1b[0m",
  italic: (string: string) =>
    "\x1b[3m" + string + "\x1b[0m",
  underline: (string: string) =>
    "\x1b[4m" + string + "\x1b[0m",
  bg: {
    black: (string: string) =>
      "\x1b[40m" + string + "\x1b[0m",
    red: (string: string) =>
      "\x1b[41m" + string + "\x1b[0m",
    green: (string: string) =>
      "\x1b[42m" + string + "\x1b[0m",
    yellow: (string: string) =>
      "\x1b[43m" + string + "\x1b[0m",
    blue: (string: string) =>
      "\x1b[44m" + string + "\x1b[0m",
    magenta: (string: string) =>
      "\x1b[45m" + string + "\x1b[0m",
    cyan: (string: string) =>
      "\x1b[46m" + string + "\x1b[0m",
    white: (string: string) =>
      "\x1b[47m" + string + "\x1b[0m",
    grey: (string: string) =>
      "\x1b[100m" + string + "\x1b[0m",
  },
  clear: (string: string) =>
    string.replaceAll(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ""
    ),
};

type Primitive =
  | string
  | boolean
  | number
  | symbol
  | null
  | undefined;

export const isPrimitive = (
  value: any
): value is Primitive =>
  [
    "number",
    "string",
    "boolean",
    "undefined",
    "function",
    "symbol",
  ].includes(typeof value) || value === null;

export const equal = <
  T extends Primitive | Record<keyof any, any>
>(
  a: T,
  b: T,
  filter: ([key, value]: [
    string,
    any
  ]) => boolean = () => true,
  depth = 0
): boolean => {
  if ([a, b].some(isPrimitive)) return a === b;

  const entriesA = Object.entries(
    a as Record<keyof any, any>
  ).filter(filter);
  const entriesB = Object.entries(
    b as Record<keyof any, any>
  ).filter(filter);

  return (
    entriesA.length === entriesB.length &&
    entriesA.every(
      ([key, value]) =>
        key in b! &&
        equal(
          value,
          (b as any)[key],
          filter,
          depth + 1
        )
    )
  );
};

export const unique = <T>(
  items: ReadonlyArray<T>
): ReadonlyArray<T> => {
  if (isPrimitive(items[0]))
    return [...new Set(items)];

  const [uniques, duplicates] = [[] as T[], [] as T[]];
  for (const item of items) {
    (uniques.find(x => equal(x as any, item))
      ? duplicates
      : uniques
    ).push(item);
  }
  return uniques;
};

export const last = <T>(arr: ReadonlyArray<T>) =>
  arr[arr.length - 1];

export const capitalise = (string: string) =>
  string[0]!.toUpperCase() + string.slice(1);

export const difference = (
  a: Record<any, any>,
  b: Record<any, any>
) => ({
  ...Object.fromEntries(
    Object.keys(a)
      .filter(key => !(key in b))
      .map(key => [key, a[key]])
  ),
  ...Object.fromEntries(
    Object.keys(b)
      .filter(key => !(key in a))
      .map(key => [key, b[key]])
  ),
});

export const typeOf = (x: any) => typeof x;

export const omit =
  <
    T extends Record<string, any>,
    K extends keyof T | ReadonlyArray<keyof T>
  >(
    key: K
  ) =>
  (value: T) => {
    let keys = [key].flat() as ReadonlyArray<keyof T>;
    const rest = { ...value };
    for (const key of keys) delete rest[key];
    return rest;
  };

export type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

export const formatBytes = (
  bytes: number,
  decimals = 2
) => {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  let i = Math.floor(Math.log(bytes) / Math.log(k));
  if (Number.isNaN(i)) i = 0;

  return `${parseFloat(
    (bytes / Math.pow(k, i)).toFixed(dm)
  )} ${sizes[i]}`;
};

export const largest = <T>(x: T[], y: T[]) =>
  x.length >= y.length ? x : y;

export const zip = <A, B>(x: A[], y: B[]) =>
  largest(x, y as any).map(
    (_, i) => [x[i], y[i]] as const
  ) as ReadonlyArray<readonly [A, B]>;

export type ReadonlyRecord<
  K extends keyof any = string,
  V = any
> = Readonly<Record<K, V>>;

type Difference = Readonly<{
  chain: string;
  a: any;
  b: any;
}>;

export const diff = (
  a: any,
  b: any,
  filter: ([key, value]: [
    string,
    any
  ]) => boolean = () => true,
  stack = [] as ReadonlyArray<Difference>,
  chain = ""
): ReadonlyArray<Difference> => {
  if ([a, b].some(isPrimitive))
    return a !== b ? [{ chain, a, b }] : stack;

  return Object.entries(a)
    .filter(filter)
    .flatMap(([key, value]) =>
      diff(
        value,
        b[key],
        filter,
        stack,
        [chain, key].filter(Boolean).join(".")
      )
    )
    .reverse();
};

export const defer = <T>(
  f: (
    resolve: (value?: T) => void,
    reject: (reason?: any) => void
  ) => void
) => {
  let resolve: Function;
  let reject: Function;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  f(
    (value?: T) => resolve(value),
    (reason?: any) => reject(reason)
  );
  return promise;
};

export const wait = (ms: number) =>
  defer(res => setTimeout(res, ms));

export const pluralise = (
  word: string,
  count: number
) => count + " " + (count === 1 ? word : word + "s");

export const getCursorPos = () =>
  new Promise<readonly [number, number]>(
    async resolve => {
      const encoding =
        process.stdin.readableEncoding ?? undefined;
      process.stdin.setEncoding("utf8");
      process.stdin.setRawMode(true);
      process.stdout.write("\u001b[6n");
      for await (const data of process.stdin) {
        const [y, x] = JSON.stringify(data)
          .slice(1, -1)
          .match(/\\u001b\[(\d+);(\d+)R$/)
          ?.slice(1)
          .map(parseInt) as [number, number];
        process.stdin.setEncoding(encoding);
        process.stdin.setRawMode(false);
        resolve([x - 1, y - 1]);
      }
    }
  );

export const dedent = (string: string) => {
  const whitespace = string.match(/^\n*([ \t]+)/)?.[1];
  const indent = whitespace?.length ?? 0;
  return string
    .replace(/^\n+|\n+$/g, "")
    .split("\n")
    .map(line => line.slice(indent))
    .join("\n");
};

export const union =
  <T>(as: ReadonlyArray<T>) =>
  (bs: ReadonlyArray<T>) => {
    const union: Record<string, T> = {};
    for (const x of as.concat(bs))
      union[JSON.stringify(x)] ??= x;
    return Object.values(union) as ReadonlyArray<T>;
  };
