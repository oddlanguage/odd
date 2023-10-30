import { readFile } from "fs/promises";
import parse from "../odd.js";
import { Branch, Token, Tree } from "../parse.js";

export default async (target: string) => {
  const stringify = (node: Tree): string => {
    switch (node.type) {
      case "program":
        return (node as Branch).children.reduce(
          (str, child) =>
            str + stringify(child) + "\n",
          ""
        );
      case "statement":
        return (
          stringify((node as Branch).children[0]!) +
          ";"
        );
      case "declaration": {
        const [pattern, value] = (
          node as Branch
        ).children.map(stringify);
        return `const ${pattern} = ${value}`;
      }
      case "literal-pattern":
        return stringify(
          (node as Branch).children[0]!
        );
      case "name":
        return (node as Token).text;
      case "number":
        return (node as Token).text.replaceAll(
          ",",
          "_"
        );
      case "string":
        return `\`${(node as Token).text
          .slice(2, -2)
          .replaceAll("`", "\\`")}\``;
      case "lambda": {
        const [pattern, body] = (
          node as Branch
        ).children.map(stringify);
        return `${
          /^[[{]]/.test(pattern!)
            ? `(${pattern})`
            : pattern
        } => ${
          body!.startsWith("{") ? `(${body})` : body
        }`;
      }
      case "application": {
        const lhsType = (node as Branch).children[0]!
          .type!;
        const [lhs, rhs] = (
          node as Branch
        ).children.map(stringify);
        return `${
          lhsType === "lambda" ? `(${lhs})` : lhs
        }${
          ["record", "list"].includes(lhsType)
            ? `[${rhs}]`
            : `(${rhs})`
        }`;
      }
      case "record":
        return `{${(node as Branch).children.reduce(
          (str, child, i) =>
            (str || " ") +
            stringify(child) +
            (i < (node as Branch).children.length - 1
              ? ", "
              : " "),
          ""
        )}}`;
      case "field": {
        const field = (node as Branch).children[0]!;
        switch (field.type) {
          case "name":
            return stringify(field);
          case "declaration": {
            const [pattern, value] = (
              field as Branch
            ).children.map(stringify);
            return `${pattern}: ${value}`;
          }
          default:
            throw `Unknown field type "${field.type}".`;
        }
      }
      case "list":
        return `[${(node as Branch).children.reduce(
          (str, child, i) =>
            (str || " ") +
            stringify(child) +
            (i < (node as Branch).children.length - 1
              ? ", "
              : " "),
          ""
        )}]`;
      default:
        throw `Unknown node type "${node.type}".`;
    }
  };

  const input = await readFile(target, "utf-8");

  return stringify(parse(input));
};
