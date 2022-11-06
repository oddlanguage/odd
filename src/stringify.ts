import { Branch, Token, Tree } from "./parser.js";
import { serialise } from "./util.js";

const stringify = (tree: Tree): string => {
  const node = tree as Branch;
  switch (node.type) {
    case "program":
      return (
        node.children.map(stringify).join(";\n") + ";"
      );
    case "declaration":
      return node.children.length > 2
        ? `const ${stringify(
            node.children[0]!
          )} = ${node.children
            .slice(1)
            .map(stringify)
            .join(" => ")}`
        : `const ${stringify(
            node.children[0]!
          )} = ${stringify(node.children[1]!)}`;
    case "lambda":
      return `((${node.children
        .slice(0, -1)
        .map(stringify)
        .join(", ")}) => ${stringify(
        node.children[node.children.length - 1]!
      )})`;
    case "infix":
      return `(${node.children
        .map(stringify)
        .join(" ")})`;
    case "application":
      return `(${
        stringify(node.children[0]!) +
        `(${stringify(node.children[1]!)})`
      })`;
    case "list":
      return `([${node.children
        .map(stringify)
        .join(", ")}])`;
    case "record":
      return `({${node.children
        .map(stringify)
        .join(", ")}})`;
    case "field": {
      const field = node.children[0] as Branch;
      return field.type === "declaration"
        ? field.children.length > 2
          ? `${stringify(
              field.children[0]!
            )}: ${field.children
              .slice(1)
              .map(stringify)
              .join(" => ")}`
          : `${stringify(
              field.children[0]!
            )}: ${stringify(field.children[1]!)}`
        : stringify(node.children[0]!);
    }
    case "destructuring":
      return "..." + stringify(node.children[0]!);
    case undefined: {
      const token = tree as Token;
      return token.text.startsWith("''")
        ? `\`${token.text.slice(2, -2)}\``
        : token.text.replace(
            /(?<=[a-z])-(?=[a-z])/gi,
            "_"
          );
    }
    default:
      console.log(serialise(node));
      throw `❌ Unhandled node type "${node.type}".`;
  }
};

export default stringify;

// TODO: Compile to wasm
// This is a bit of a pain because
// webassembly text (.wat) can't be
// compiled so it has to be translated
// to the binary format first (.wasm)
// which cannot be done on the web
// but rather you need to build some
// weird as tool from c++ (WABT wat2wasm)
// which is just not okay.
// https://developer.mozilla.org/en-US/docs/WebAssembly/Understanding_the_text_format
