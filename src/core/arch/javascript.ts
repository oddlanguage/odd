import { readFile } from "fs/promises";
import parse from "../odd.js";
import { Branch, Token, Tree } from "../parse.js";
import { makeError } from "../problem.js";

export default async (target: string) => {
  const input = await readFile(target, "utf-8");
  return stringify(parse(input), input);
};

const stringify = (
  node: Tree,
  input: string
): string => {
  switch (node.type) {
    case "program": {
      return (node as Branch).children.reduce(
        (str, child) =>
          str + stringify(child, input) + "\n",
        ""
      );
    }
    case "statement": {
      return (
        stringify(
          (node as Branch).children[0]!,
          input
        ) + ";"
      );
    }
    case "expression-statement": {
      return stringify(
        (node as Branch).children[0]!,
        input
      );
    }
    case "declaration": {
      const [pattern, value] = (
        node as Branch
      ).children.map(node => stringify(node, input));
      return `const ${pattern} = ${value}`;
    }
    case "literal-pattern": {
      return stringify(
        (node as Branch).children[0]!,
        input
      );
    }
    case "name": {
      return (node as Token).text.replace(
        /-([a-z])/gi,
        ([, x]) => x!.toUpperCase()
      );
    }
    case "number": {
      return (node as Token).text.replaceAll(",", "_");
    }
    case "string": {
      return `\`${(node as Token).text
        .slice(2, -2)
        .replaceAll("`", "\\`")}\``;
    }
    case "lambda": {
      const [pattern, body] = (
        node as Branch
      ).children.map(node => stringify(node, input));
      return `${
        /^[[{]/.test(pattern!)
          ? `(${pattern})`
          : pattern
      } => ${
        body!.startsWith("{") ? `(${body})` : body
      }`;
    }
    case "application": {
      const lhsType = (node as Branch).children[0]!
        .type!;
      const [lhs, rhs] = (node as Branch).children.map(
        node => stringify(node, input)
      );
      return `${
        lhsType === "lambda" ? `(${lhs})` : lhs
      }${
        ["record", "list"].includes(lhsType)
          ? `[${rhs}]`
          : `(${rhs})`
      }`;
    }
    case "record": {
      return `{${(node as Branch).children.reduce(
        (str, child, i) =>
          (str || " ") +
          stringify(child, input) +
          (i < (node as Branch).children.length - 1
            ? ", "
            : " "),
        ""
      )}}`;
    }
    case "field": {
      const field = (node as Branch).children[0]!;
      switch (field.type) {
        case "name":
          return stringify(field, input);
        case "declaration": {
          const [pattern, value] = (
            field as Branch
          ).children.map(node =>
            stringify(node, input)
          );
          return `${pattern}: ${value}`;
        }
        default:
          throw `Unknown field type "${field.type}".`;
      }
    }
    case "list": {
      return `[${(node as Branch).children.reduce(
        (str, child, i) =>
          (str || " ") +
          stringify(child, input) +
          (i < (node as Branch).children.length - 1
            ? ", "
            : " "),
        ""
      )}]`;
    }
    case "record-pattern": {
      return `{ ${(node as Branch).children
        .map(child => stringify(child, input))
        .join(", ")} }`;
    }
    case "field-pattern": {
      return stringify(
        (node as Branch).children[0]!,
        input
      );
    }
    case "list-pattern": {
      return `[ ${(node as Branch).children
        .map(child => stringify(child, input))
        .join(", ")} ]`;
    }
    case "rest-pattern": {
      return `...${stringify(
        (node as Branch).children[0]!,
        input
      )}`;
    }
    default: {
      throw makeError(input, [
        {
          reason: `Unknown node type "${node.type}".`,
          at: node.offset,
          size: node.size,
        },
      ]);
    }
  }
};
