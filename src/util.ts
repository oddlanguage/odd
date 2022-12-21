import { inspect } from "node:util";

export const serialise = (x: any) =>
  typeof x === "string"
    ? x
    : inspect(x, {
        depth: Infinity,
        colors: true,
        compact: 1,
        breakLength: 110
      });

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

export const isPrimitive = (
  value: any
): value is Primitive =>
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
  b: T,
  filter: ([key, value]: [
    string,
    any
  ]) => boolean = () => true
): boolean => {
  if ([a, b].some(isPrimitive)) return a === b;

  const entriesA = Object.entries(a).filter(
    filter as any
  );
  const entriesB = Object.entries(b).filter(
    filter as any
  );

  return (
    entriesA.length === entriesB.length &&
    entriesA.every(
      ([key, value]) =>
        key in b && equal(value, b[key], filter)
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
  )
});

export const typeOf = (x: any) => typeof x;

export const equals = (b: any) => (a: any) => a === b;

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
