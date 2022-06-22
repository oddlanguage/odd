import { inspect } from "node:util";

export const serialise = (value: any) =>
  inspect(value, false, Infinity, true);

export const prefixIndefiniteArticle = (
  thing?: string
) =>
  thing &&
  `${/^[aeuioy]/.test(thing) ? "an" : "a"} ${thing}`;

export const escapeSpecialChars = (string: string) =>
  string
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f")
    .replace(/\v/g, "\\v");
