import { Branch, Token, Tree } from "./parser.js";
import { serialise } from "./util.js";

const lazyAccessor = (x: string) =>
  `(k=>{const _=${x};return k===undefined?_:_[k]})`;

const prelude = `const ENV = {
  "/":a=>b=>b/a,
  "*":a=>b=>b*a,
  "+":a=>b=>(b===undefined)?+a:b+a,
  "-":a=>b=>(b===undefined)?-a:b-a,
  "%":a=>b=>b%a,
  "^":a=>b=>b**a,
  "<":a=>b=>b<a,
  ">":a=>b=>b>a,
  "<=":a=>b=>b<=a,
  ">=":a=>b=>b>=a,
  "==":a=>b=>b===a,
  "!=":a=>b=>b!==a,
  "&":a=>b=>b&&a,
  "|":a=>b=>b||a,
  ".":a=>b=>x=>b(a(x)),
  ".>":a=>b=>x=>a(b(x)),
  "|>":x=>a=>x(a),
  "<|":a=>x=>x(a),
  "true":true,
  "false":false,
  nothing:null,
  infinity:Infinity,
  not:x=>!x,
  map:x=>y=>${lazyAccessor("y().map(z=>x(z))")},
  filter:x=>y=>${lazyAccessor("y().filter(z=>x(z))")},
  head:x=>{const y=x();return y.length?y[0]:ENV["nothing"]},
  last:x=>{const y=x();return y.length?y[y.length-1]:ENV["nothing"]},
  tail:x=>${lazyAccessor("x().slice(1)")},
  eval:x=>x(),
  join:x=>y=>y().join(x),
  take:n=>x=>${lazyAccessor("x().slice(0,n)")},
  drop:n=>x=>${lazyAccessor("x().slice(n)")},
  size:x=>{const y=x();return y?.constructor===Object?Object.keys(y).length:y.length},
  reverse:x=>${lazyAccessor("x().slice().reverse()")},
  zip:x=>y=>${lazyAccessor(
    "(()=>{const a=x();const b=y();return a.map((h,i)=>[h, b[i]])})()"
  )},
  any:x=>y=>y().some(a=>x(a)),
  all:x=>y=>y().every(a=>x(a)),
  repeat:x=>n=>${lazyAccessor(
    "[...Array(n).keys()].map(()=>x)"
  )},
};
`;

const stringify = (tree: Tree): string => {
  const node = tree as Branch;
  switch (node.type) {
    case "program":
      return (
        prelude +
        node.children.map(stringify).join(";\n") +
        ";"
      );
    case "declaration":
      return node.children.length > 2
        ? `ENV["${
            (node.children[0] as Token).text
          }"]=${node.children
            .slice(1)
            .map(param => (param as Token).text)
            .join("=>")}`
        : `ENV["${
            (node.children[0] as Token).text
          }"]=${stringify(node.children[1]!)}`;
    case "lambda":
      return `(${node.children
        .slice(0, -1)
        .map(param => (param as Token).text)
        .join("=>")}=>${stringify(
        node.children[node.children.length - 1]!
      )})`;
    case "infix":
      return `(${stringify(
        node.children[1]!
      )}(${stringify(node.children[2]!)}))(${stringify(
        node.children[0]!
      )})`;
    case "application":
      return `(${
        stringify(node.children[0]!) +
        `(${stringify(node.children[1]!)})`
      })`;
    case "list":
      return lazyAccessor(
        `[${node.children.map(stringify).join(",")}]`
      );
    case "record":
      return lazyAccessor(
        `{${node.children.map(stringify).join(",")}}`
      );
    case "field": {
      const field = node.children[0] as Branch;
      return field.type === "declaration"
        ? `${(field.children[0] as Token).text}:${
            field.children.length > 2
              ? field.children
                  .slice(1)
                  .map(stringify)
                  .join("=>")
              : stringify(field.children[1]!)
          }`
        : (field.children[0] as Token).text;
    }
    case "operator": {
      const op = (node.children[0] as Token).text;
      return `(ENV["${op}"]??(()=>{throw\`Unknown operator "${op}".\`})())`;
    }
    case "string":
      return `\`${(
        node.children[0] as Token
      ).text.slice(2, -2)}\``;
    case "number":
      return (node.children[0] as Token).text.replace(
        /,/g,
        "_"
      );
    case "destructuring":
      return (
        "..." + stringify(node.children[0]!) + "()"
      );
    case undefined: {
      const token = tree as Token;
      const name = token.text.replace(
        /(?<=[a-z])-(?=[a-z])/gi,
        "_"
      );
      return name === "nothing"
        ? `ENV["nothing"]`
        : `(ENV["${name}"]??(()=>{throw\`Unknown name "${name}".\`})())`;
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
