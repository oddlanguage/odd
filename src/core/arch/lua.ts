import { readFile } from "fs/promises";
import parse from "../odd.js";
import { Branch, Token, Tree } from "../parse.js";
import { makeError } from "../problem.js";
import { ReadonlyRecord } from "../util.js";

export default async (target: string) => {
  const input = await readFile(target, "utf-8");
  return stringify(parse(input), 0, input);
};

const stringify = (
  node: Tree,
  depth: number,
  input: string
): string => {
  const pad = "  ".repeat(depth);
  switch (node.type) {
    case "program": {
      return (
        "local _;\n" +
        (node as Branch).children.reduce(
          (str, child, i, { length }) =>
            str +
            stringify(child, depth, input) +
            (i < length - 1 ? "\n" : ""),
          ""
        )
      );
    }
    case "statement": {
      return (
        stringify(
          (node as Branch).children[0]!,
          depth,
          input
        ) + ";"
      );
    }
    case "expression-statement": {
      return `_ = ${stringify(
        (node as Branch).children[0]!,
        depth,
        input
      )}`;
    }
    case "declaration": {
      const patterns = extractPatterns(
        (node as Branch).children[0] as Branch,
        "_",
        input
      );
      const value = stringify(
        (node as Branch).children[1]!,
        depth + 1,
        input
      );
      return `_ = ${value};\n${pad}${Object.entries(
        patterns
      )
        .map(entry => "local " + entry.join("="))
        .join(";")}`;
    }
    case "name": {
      return (node as Token).text.replace(
        /-([a-z])/gi,
        ([, x]) => x!.toUpperCase()
      );
    }
    case "number": {
      return (node as Token).text.replaceAll(",", "");
    }
    case "string": {
      return `"${(node as Token).text
        .slice(2, -2)
        .replaceAll(
          /\\.|(?<!\\)"/g,
          esc => "\\" + esc
        )}"`;
    }
    case "lambda": {
      const body = stringify(
        (node as Branch).children[1]!,
        depth + 1,
        input
      );
      const patterns = extractPatterns(
        (node as Branch).children[0] as Branch,
        "arg",
        input
      );
      return `function (arg)\n${pad}${Object.entries(
        patterns
      )
        .map(entry => "local " + entry.join("="))
        .join(
          ";\n" + pad
        )};\n${pad}return ${body}\n${pad.slice(
        0,
        depth * 2 - 2
      )}end`;
    }
    case "application": {
      const lhsType = (node as Branch).children[0]!
        .type!;
      const [lhs, rhs] = (node as Branch).children.map(
        node => stringify(node, depth, input)
      );
      return `${
        lhsType !== "name" ? `(${lhs})` : lhs
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
          stringify(child, depth, input) +
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
          return stringify(field, depth, input);
        case "declaration": {
          const name = (
            ((field as Branch).children[0] as Branch)
              .children[0] as Token
          ).text;
          const value = stringify(
            (field as Branch).children[1]!,
            depth,
            input
          );
          return `${name} = ${value}`;
        }
        default:
          throw `Unknown field type "${field.type}".`;
      }
    }
    case "list": {
      return `{${(node as Branch).children.reduce(
        (str, child, i) =>
          (str || " ") +
          stringify(child, depth, input) +
          (i < (node as Branch).children.length - 1
            ? ", "
            : " "),
        ""
      )}}`;
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

const extractPatterns = (
  pattern: Branch,
  target: string,
  input: string
): ReadonlyRecord => {
  switch (pattern.type) {
    case "rest-pattern": {
      const literal = pattern.children[0] as Token;
      return { [literal.text]: target };
    }
    case "literal-pattern": {
      const literal = pattern.children[0]!;
      switch (literal.type) {
        case "operator":
        case "name": {
          const name = (literal as Token).text.replace(
            /-([a-z])/gi,
            ([, x]) => x!.toUpperCase()
          );
          return { [name]: target };
        }
        default: {
          throw makeError(input, [
            {
              reason: `Unknown literal pattern type "${literal.type}".`,
              at: literal.offset,
              size: literal.size,
            },
          ]);
        }
      }
    }
    case "list-pattern": {
      return (pattern.children as Branch[]).reduce(
        (extracted, pattern, i) => ({
          ...extracted,
          ...extractPatterns(
            pattern,
            pattern.type === "rest-pattern"
              ? `{table.unpack(${target}, ${i + 1})}`
              : target + `[${i + 1}]`,
            input
          ),
        }),
        {}
      );
    }
    default: {
      throw makeError(input, [
        {
          reason: `Unknown pattern type "${pattern.type}".`,
          at: pattern.offset,
          size: pattern.size,
        },
      ]);
    }
  }
};
