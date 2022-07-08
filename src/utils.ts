import { inspect } from "node:util";

export const serialise = (value: any) =>
  inspect(value, false, Infinity, true);

export const prefixIndefiniteArticle = (
  thing?: string
) =>
  thing &&
  `${/^[aeuioy]/.test(thing) ? "an" : "a"} ${thing}`;

export const suffixOrdinal = (number: number) => {
  const stringified = number.toString();
  return (
    stringified +
    (() => {
      switch (stringified.slice(-1)[0]) {
        case "1":
          return "st";
        case "2":
          return "nd";
        case "3":
          return "rd";
        default:
          return "th";
      }
    })()
  );
};

export const escapeSpecialChars = (string: string) =>
  string
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f")
    .replace(/\v/g, "\\v");

export const capitalise = (string: string) =>
  string[0]!.toUpperCase() + string.slice(1);
