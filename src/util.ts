import { inspect } from "node:util";

export const serialise = (x: any) =>
  typeof x === "string"
    ? x
    : inspect(x, false, Infinity, true);

export const log = <T>(x: T) => {
  console.log(serialise(x));
  return x;
};

export const redUnderline = (string: string) =>
  "\x1b[31;4m" + string + "\x1b[0m";

type Primitive =
  | string
  | boolean
  | number
  | symbol
  | null
  | undefined;

export const isPrimitive = <T>(
  value: T | Primitive
): value is T =>
  [
    "number",
    "string",
    "boolean",
    "undefined"
  ].includes(typeof value) || value === null;

export const equal = <
  T extends Record<keyof any, any>
>(
  a: T,
  b: T
): boolean =>
  isPrimitive(a)
    ? a === b
    : Object.keys(a).length ===
        Object.keys(b).length &&
      Object.entries(a).every(
        ([key, value]) =>
          key in b && equal(value, b[key])
      );

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

export type Mutable<T extends Record<keyof any, any>> =
  {
    -readonly [K in keyof T]: T[K];
  };

export const chunk =
  (n: number) =>
  <T>(
    values: ReadonlyArray<T> | T[]
  ): ReadonlyArray<ReadonlyArray<T>> => {
    if (n <= 0)
      throw new RangeError(
        `n out of range [1..${values.length}]: ${n}`
      );
    const chunks = [] as any[];
    const copy = values.slice();
    while (copy.length) chunks.push(copy.splice(0, n));
    return chunks;
  };