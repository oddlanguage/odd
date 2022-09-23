import { readFile } from "fs/promises";
import path from "node:path";
import url from "node:url";
import Token from "../lexer/token.js";
import { Tree } from "../parser/ast.js";
import parser from "./parser.js";

const [target, output] = process.argv.slice(2);
if (!target) throw "No target file specified.";
if (!output) throw "No output name specified.";

const kebab2camel = (str: string) =>
  str.replace(/-[a-z]/gi, match =>
    match.slice(1).toUpperCase()
  );

const stringify = (node: Tree | Token): string => {
  switch (node.type) {
    case "program":
      return (
        ((node as Tree).children as Tree[])
          .map(stringify)
          .join(";\n") +
        ";\nexport default run(program);\n"
      );
    case "declaration": {
      const [{ lexeme: name }, { lexeme: op }, rhs] = (
        node as Tree
      ).children as [Token, Token, Tree];
      return `const ${kebab2camel(name)}=${(() => {
        switch (op) {
          case "=":
            return stringify(rhs);
          case ":=":
            return `node("${name}")(${stringify(
              rhs
            )})`;
        }
      })()}`;
    }
    case "choice":
      return `oneOf([${(
        (node as Tree).children as Tree[]
      )
        .map(stringify)
        .join(",")}])`;
    case "sequence":
      return `sequence([${(
        (node as Tree).children as Tree[]
      )
        .map(stringify)
        .join(",")}])`;
    case "quantified": {
      const [lhs, { lexeme: quantifier }] = (
        node as Tree
      ).children as [Tree, Token];
      return `${(() => {
        switch (quantifier) {
          case "*":
            return "zeroOrMore";
          case "+":
            return "oneOrMore";
          case "?":
            return "optional";
        }
      })()}(${stringify(lhs)})`;
    }
    case "ignoration":
      return `ignore(${stringify(
        ((node as Tree).children as Tree[])[0]!
      )})`;
    case "labeled": {
      const [{ lexeme: name }, rhs] = (node as Tree)
        .children as [Token, Tree];
      return `node("${name}")(${stringify(rhs)})`;
    }
    case "type":
      return `type("${
        ((node as Tree).children as [Token])[0].lexeme
      }")`;
    case "name":
      return `lazy(()=>${(node as Token).lexeme})`;
    case "string":
      return `lexeme(${(node as Token).lexeme})`;
    default:
      throw `Unhandled node type "${node.type}".`;
  }
};

readFile(target, "utf-8")
  .then(
    input => parser({ input, name: target })[0] as Tree
  )
  .then(stringify)
  .then(data =>
    readFile(
      path.join(
        url.fileURLToPath(import.meta.url),
        "../../parser/parser.js"
      ),
      "utf-8"
    ).then(parser => console.log(parser + data))
  ) //writeFile(output + ".js", data))
  .catch(console.error);

//optional(ignore(oneOrMore(oneOf([type("comment"),type("whitespace")]))));
