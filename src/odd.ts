import { readFile } from "node:fs/promises";
import path from "node:path";
import _eval from "./eval.js";
import {
  between,
  Branch,
  chain,
  choice,
  eof,
  except,
  ignore,
  label,
  lazy,
  map,
  node,
  nodeLeft,
  oneOrMore,
  optional,
  pattern,
  run,
  separatedBy,
  string,
  trace,
  unpack,
  _try
} from "./parser.js";
import { difference, equal } from "./util.js";

const comment = pattern(/--[^\n]+/);

const spaces = pattern(/\s+/);

const ws = _try(
  ignore(oneOrMore(choice([spaces, comment])))
);

const name = label("a name")(
  pattern(/[a-z]+\w*(?:-\w+)*/i, "name")
);

const oddString = label("a string")(
  pattern(/''(?:[^']|\')*?(?<!\\)''/, "string")
);

const number = label("a number")(
  pattern(
    /-?(?:\d+(?:,\d+)*(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i,
    "number"
  )
);

const operator = label("an operator")(
  pattern(
    /[-=!@#$%^&*_+:\|\/\\\.\<\>\?]+(?<!^(?:=|->|\.(?=\d)))/,
    "operator"
  )
);

const parenthesised = between(ignore(string("(")))(
  ignore(string(")"))
);

const parameters = separatedBy(ws)(
  except(string("case"))(lazy(() => atom))
);

// TODO: Cleanup
// TODO: Patterns
const declaration = node("declaration")(
  map(children => {
    if (children.length === 2) return children;
    // Wrap multi-param into separate lambdas
    const funPart = children.slice(1);
    let node = {
      type: "lambda",
      children: funPart
    };
    let i = funPart.length;
    const step = 2;
    while (i > step) {
      const body = node.children.slice(i - step, i);
      node.children = [
        ...funPart.slice(0, i - step),
        {
          type: "lambda",
          children: body
        }
      ];
      i -= 1;
    }
    return [children[0]!, node as Branch];
  })(
    chain([
      parameters,
      ws,
      ignore(string("=")),
      ws,
      lazy(() => expression)
    ])
  )
);

const match = node("match")(
  chain([
    ignore(string("case")),
    ws,
    parenthesised(lazy(() => expression)),
    ws,
    ignore(string("of")),
    ws,
    separatedBy(chain([ws, ignore(string(",")), ws]))(
      lazy(() => matchCase)
    )
  ])
);

const matchCase = node("case")(
  chain([
    choice([
      lazy(() => expression),
      pattern(/_+/, "placeholder")
    ]),
    ws,
    ignore(string("=")),
    ws,
    lazy(() => expression)
  ])
);

const precedenceMatch = choice([
  match,
  lazy(() => precedenceLambda)
]);

// TODO: Cleanup
const lambda = map(children => {
  // Wrap multi-param into separate lambdas
  let node = {
    type: "lambda",
    children
  };
  let i = children.length;
  const step = 2;
  while (i > step) {
    const body = node.children.slice(i - step, i);
    node.children = [
      ...children.slice(0, i - step),
      {
        type: "lambda",
        children: body
      }
    ];
    i -= 1;
  }
  return [node as Branch];
})(
  chain([
    parameters,
    ws,
    ignore(string("->")),
    ws,
    lazy(() => expression)
  ])
);

const precedenceLambda = choice([
  lambda,
  lazy(() => precedenceInfix)
]);

const infix = nodeLeft(
  "infix",
  3
)(
  chain([
    choice([
      lazy(() => match),
      lambda,
      lazy(() => application),
      lazy(() => atom)
    ]),
    oneOrMore(
      chain([
        ws,
        operator,
        ws,
        choice([
          lazy(() => match),
          lambda,
          lazy(() => application),
          lazy(() => atom)
        ])
      ])
    )
  ])
);

const precedenceInfix = choice([
  infix,
  lazy(() => precedenceApplication)
]);

const application = nodeLeft("application")(
  chain([
    lazy(() => atom),
    oneOrMore(
      chain([
        ws,
        choice([
          lazy(() => match),
          lazy(() => atom),
          infix,
          lambda
        ])
      ])
    )
  ])
);

const precedenceApplication = choice([
  application,
  lazy(() => atom)
]);

const destructuring = node("destructuring")(
  chain([ignore(string("...")), ws, lazy(() => atom)])
);

const element = choice([
  destructuring,
  lazy(() => expression)
]);

const list = node("list")(
  chain([
    ignore(string("[")),
    ws,
    optional(
      separatedBy(
        chain([ws, ignore(string(",")), ws])
      )(element)
    ),
    ws,
    _try(ignore(string(","))),
    ws,
    ignore(string("]"))
  ])
);

const field = node("field")(
  choice([destructuring, declaration, name])
);

const record = trace(
  node("record")(
    chain([
      ignore(string("{")),
      ws,
      optional(
        separatedBy(
          chain([ws, ignore(string(",")), ws])
        )(field)
      ),
      ws,
      _try(ignore(string(","))),
      ws,
      ignore(string("}"))
    ])
  )
);

const literal = choice([
  oddString,
  name,
  number,
  list,
  record,
  parenthesised(operator)
]);

const atom = choice([
  literal,
  parenthesised(lazy(() => expression))
]);

const statement = choice([
  declaration,
  lazy(() => expression)
]);

const expression = precedenceMatch;

const statements = chain([
  separatedBy(chain([ws, ignore(string(";")), ws]))(
    statement
  ),
  ws,
  _try(ignore(string(";")))
]);

const program = node("program")(
  chain([
    ws,
    choice([eof, chain([trace(statements), ws, eof])])
  ])
);

const odd = program;

const parse = (input: string) =>
  unpack(run(odd)(input))[0]!;

export default parse;

export const nothing = Symbol("nothing");

export const defaultEnv = {
  "/": (b: any) => (a: any) => a / b,
  "*": (b: any) => (a: any) => a * b,
  "+": (b: any) => (a: any) => a + b,
  "-": (b: any) => (a: any) => a - b,
  "%": (b: any) => (a: any) => a % b,
  "^": (b: any) => (a: any) => a ** b,
  "<": (b: any) => (a: any) => a < b,
  ">": (b: any) => (a: any) => a > b,
  "<=": (b: any) => (a: any) => a <= b,
  ">=": (b: any) => (a: any) => a >= b,
  "==": (b: any) => (a: any) => equal(a, b),
  "!=": (b: any) => (a: any) => !equal(a, b),
  "&": (b: any) => (a: any) => a && b,
  "|": (b: any) => (a: any) => a || b,
  "<.": (g: Function) => (f: Function) => (x: any) =>
    f(g(x)),
  ".>": (g: Function) => (f: Function) => (x: any) =>
    g(f(x)),
  "|>": (x: any) => (f: Function) => f(x),
  "<|": (f: Function) => (x: any) => f(x),
  "@": (k: string) => (x: any) => x[k],
  true: true,
  false: false,
  nothing,
  infinity: Infinity,
  not: (x: any) => !x,
  has: (k: string) => (x: any) => k in x,
  map: (f: (x: any) => any) => (xs: any[]) =>
    xs.map(f),
  group:
    (f: (x: any) => string) =>
    (x: Record<any, any>[]) => {
      const groups: Record<string, any> = {};
      for (const obj of x) {
        const key = f(obj);
        if (!groups[key]) groups[key] = [];
        groups[key].push(obj);
      }
      return groups;
    },
  filter: (f: (x: any) => any) => (xs: any[]) =>
    xs.filter(f),
  fold:
    (f: (a: any) => (x: any) => any) =>
    (a: any) =>
    (xs: any[]) =>
      xs.reduce((a, x) => f(x)(a), a),
  foldr:
    (f: (a: any) => (x: any) => any) =>
    (a: any) =>
    (xs: any[]) =>
      xs.reduceRight((a, x) => f(x)(a), a),
  reverse: (xs: any[]) => xs.slice().reverse(),
  head: (xs: any[]) => xs[0] ?? nothing,
  tail: (xs: any[]) => xs.slice(1),
  sort:
    (f: (b: any) => (a: any) => number) =>
    (xs: any[]) =>
      xs.slice().sort((a, b) => f(a)(b)),
  "sort-by": (key: string | Function) => (xs: any[]) =>
    xs
      .slice()
      .sort((a, b) =>
        typeof key === "function"
          ? key(a) > key(b)
            ? -1
            : key(b) > key(a)
            ? 1
            : 0
          : a[key] > b[key]
          ? 1
          : b[key] > a[key]
          ? -1
          : 0
      ),
  partition:
    (f: (x: any) => boolean) => (xs: any[]) => {
      const parts: [any[], any[]] = [[], []];
      for (const x of xs) parts[f(x) ? 1 : 0].push(x);
      return parts;
    },
  size: (x: any) => Object.keys(x).length,
  max: (a: any) => (b: any) => Math.max(a, b),
  min: (a: any) => (b: any) => Math.min(a, b),
  show: (x: any) => {
    console.log(x);
    return x;
  },
  import: (name: string) =>
    readFile(
      path.parse(name).ext ? name : name + ".odd",
      "utf8"
    ).then(
      input =>
        difference(
          defaultEnv,
          _eval(parse(input), defaultEnv, input)[1]
        ),
      err =>
        err.code === "ENOENT"
          ? `Cannot resolve module "${name}".`
          : err.toString()
    )
};
