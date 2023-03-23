import { readFileSync } from "node:fs";
import path from "node:path";
import _eval from "./eval.js";
import {
  Branch,
  Parser,
  Token,
  _try,
  between,
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
  unpack
} from "./parser.js";
import {
  newGenericList,
  newGenericRecord,
  newLambdaType,
  newListType,
  newRecordType,
  newTupleType,
  newTypeclassConstraint,
  newUnionType,
  oddBoolean,
  oddNever,
  oddNothing,
  oddNumber,
  oddString as oddStringType,
  stringify
} from "./type.js";
import {
  ReadonlyRecord,
  equal,
  redUnderline,
  serialise
} from "./util.js";

const comment = pattern(/--[^\n]+/);

const spaces = pattern(/\s+/);

const wildcard = pattern(/_+/, "wildcard");

const name = except(string("of"))(
  label("a name")(
    pattern(/[a-z]+\w*(?:-\w+)*/i, "name")
  )
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
    /[-=!@#$%^&*_+:|/\\.<>?]+(?<!^(?:\.(?=\d)|->|[=:]))/,
    "operator"
  )
);

const ws = _try(
  ignore(oneOrMore(choice([spaces, comment])))
);

const listOf = (parser: Parser) =>
  chain([
    separatedBy(chain([ws, ignore(string(",")), ws]))(
      parser
    ),
    ws,
    _try(ignore(string(",")))
  ]);

const parenthesised = between(ignore(string("(")))(
  ignore(string(")"))
);

const _pattern = choice([
  lazy(() => literalPattern),
  lazy(() => listPattern),
  lazy(() => recordPattern)
]);

const literalPattern = node("literal-pattern")(
  choice([
    oddString,
    pattern(/true|false/, "boolean"),
    number,
    parenthesised(operator),
    name,
    wildcard
  ])
);

const listPattern = node("list-pattern")(
  chain([
    ignore(string("[")),
    ws,
    optional(
      listOf(
        choice([_pattern, lazy(() => restPattern)])
      )
    ),
    ws,
    ignore(string("]"))
  ])
);

const restPattern = node("rest-pattern")(
  chain([ignore(string("...")), name])
);

const recordPattern = node("record-pattern")(
  chain([
    ignore(string("{")),
    ws,
    optional(listOf(lazy(() => fieldPattern))),
    ws,
    ignore(string("}"))
  ])
);

const fieldPattern = node("field-pattern")(
  choice([
    restPattern,
    chain([
      node("literal-pattern")(name),
      _try(
        chain([ws, ignore(string("=")), ws, _pattern])
      )
    ])
  ])
);

const infixPattern = node("infix-pattern")(
  chain([
    lazy(() => _pattern),
    ws,
    operator,
    ws,
    lazy(() => _pattern)
  ])
);

// TODO: Cleanup
const declaration = node("declaration")(
  map(children => {
    if (children.length === 2) {
      if (children[0]?.type === "infix-pattern") {
        const body = children[1]!;
        const [lhs, op, rhs] = (children[0] as Branch)
          .children as [Token, Token, Token];
        return [
          {
            type: "literal-pattern",
            children: [op],
            offset: op.offset,
            size: op.size
          },
          {
            type: "lambda",
            children: [
              rhs,
              {
                type: "lambda",
                children: [lhs, body],
                offset: rhs.offset,
                size:
                  body.offset - rhs.offset + body.size
              }
            ],
            offset: op.offset,
            size: body.offset - op.offset + body.size
          }
        ];
      } else {
        return children;
      }
    }
    // Wrap multi-param into separate lambdas
    const funPart = children.slice(1);
    const offset = funPart[0]!.offset;
    const size =
      funPart[funPart.length - 1]!.offset - offset;
    const node = {
      type: "lambda",
      children: funPart,
      offset,
      size
    };
    let i = funPart.length;
    const step = 2;
    while (i > step) {
      const body = node.children.slice(i - step, i);
      const offset = body[0]!.offset;
      const size =
        body[body.length - 1]!.offset - offset;
      node.children = [
        ...funPart.slice(0, i - step),
        {
          type: "lambda",
          children: body,
          offset,
          size
        }
      ];
      i -= 1;
    }
    return [children[0]!, node as Branch];
  })(
    chain([
      choice([
        infixPattern,
        separatedBy(ws)(_pattern)
      ]),
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
    lazy(() => expression),
    ws,
    ignore(string("of")),
    ws,
    listOf(lazy(() => matchCase))
  ])
);

const matchCase = node("case")(
  chain([
    _pattern,
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
  const offset = children[0]!.offset;
  const size =
    children[children.length - 1]!.offset - offset;
  const node = {
    type: "lambda",
    children,
    offset,
    size
  };
  let i = children.length;
  const step = 2;
  while (i > step) {
    const body = node.children.slice(i - step, i);
    const offset = body[0]!.offset;
    const size =
      body[body.length - 1]!.offset - offset;
    node.children = [
      ...children.slice(0, i - step),
      {
        type: "lambda",
        children: body,
        offset,
        size
      }
    ];
    i -= 1;
  }
  return [node as Branch];
})(
  chain([
    separatedBy(ws)(_pattern),
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
    optional(listOf(element)),
    ws,
    ignore(string("]"))
  ])
);

const field = node("field")(
  choice([destructuring, declaration, name])
);

const record = node("record")(
  chain([
    ignore(string("{")),
    ws,
    optional(listOf(field)),
    ws,
    ignore(string("}"))
  ])
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
    choice([eof, chain([statements, ws, eof])])
  ])
);

const odd = program;

const parse = (input: string) =>
  unpack(run(odd)(input))[0]!;

export default parse;

export const nothing = Symbol("nothing");

export const defaultEnv: ReadonlyRecord = {
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
  not: (x: any) => [0, nothing, false].includes(x),
  has: (k: string) => (x: any) => k in x,
  range: (n: number) => [...Array(n).keys()],
  "range-from": (from: number) => (to: number) =>
    [...Array(to).keys()].slice(from),
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
  replace:
    (key: keyof any) =>
    (value: any) =>
    (target: any) => {
      if (Array.isArray(target)) {
        const clone = target.slice();
        clone.splice(key as number, 1, value);
        return clone;
      } else {
        const clone = { ...target };
        clone[key] = value;
        return clone;
      }
    },
  reverse: (xs: any[]) => xs.slice().reverse(),
  head: (xs: any[]) => xs[0] ?? nothing,
  last: (xs: any[]) => xs[xs.length - 1] ?? nothing,
  tail: (xs: any[]) => xs.slice(1),
  drop: (n: number) => (xs: any[]) => xs.slice(n),
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
    // TODO: Serialise as odd values instead of js values
    console.log(serialise(x));
    return x;
  },
  import: (name: string) => {
    try {
      const input = readFileSync(
        path.parse(name).ext ? name : name + ".odd",
        "utf8"
      );
      return _eval(parse(input), defaultEnv, input)[1];
    } catch (err: any) {
      // TODO: use `makeError`
      throw err.code === "ENOENT"
        ? `Cannot resolve module "${name}".`
        : err.toString();
    }
  },
  panic: (reason: string) => {
    // TODO: Use `makeError`
    throw redUnderline("Uh oh: " + reason);
  },
  benchmark: (f: Function) => {
    const times: number[] = [];
    let result: any;
    for (let i = 0; i < 100; i++) {
      const before = performance.now();
      result = f();
      times.push(performance.now() - before);
      if (i === 99) {
        console.log(
          `Takes ~${(
            times.reduce((a, b) => a + b, 0) /
            times.length
          ).toFixed(3)}ms on average`
        );
        return result;
      }
    }
  }
};

export const defaultTypeEnv: ReadonlyRecord = {
  "/": newLambdaType(
    oddNumber,
    newLambdaType(oddNumber, oddNumber)
  ),
  "*": newLambdaType(
    oddNumber,
    newLambdaType(oddNumber, oddNumber)
  ),
  "+": newLambdaType(
    oddNumber,
    newLambdaType(oddNumber, oddNumber)
  ),
  "-": newLambdaType(
    oddNumber,
    newLambdaType(oddNumber, oddNumber)
  ),
  "%": newLambdaType(
    oddNumber,
    newLambdaType(oddNumber, oddNumber)
  ),
  "^": newLambdaType(
    oddNumber,
    newLambdaType(oddNumber, oddNumber)
  ),
  ...(() => {
    const ord = Symbol("Ord");
    const a = 0;
    const b = 1;
    const constraints = { [stringify(a)]: ord };
    return {
      "<": newTypeclassConstraint(
        constraints,
        newLambdaType(a, newLambdaType(a, oddNumber))
      ),
      ">": newTypeclassConstraint(
        constraints,
        newLambdaType(a, newLambdaType(a, oddNumber))
      ),
      "<=": newTypeclassConstraint(
        constraints,
        newLambdaType(a, newLambdaType(a, oddNumber))
      ),
      ">=": newTypeclassConstraint(
        constraints,
        newLambdaType(a, newLambdaType(a, oddNumber))
      ),
      "@": newTypeclassConstraint(
        constraints,
        newLambdaType(
          a,
          newLambdaType(
            newGenericRecord(b),
            newUnionType([b, oddNothing])
          )
        )
      ),
      has: newTypeclassConstraint(
        constraints,
        newLambdaType(
          a,
          newLambdaType(
            newGenericRecord(b),
            oddBoolean
          )
        )
      ),
      min: newTypeclassConstraint(
        constraints,
        newLambdaType(a, newLambdaType(a, a))
      ),
      max: newTypeclassConstraint(
        constraints,
        newLambdaType(a, newLambdaType(a, a))
      )
      // sort:
      //   (f: (b: any) => (a: any) => number) =>
      //   (xs: any[]) =>
      //     xs.slice().sort((a, b) => f(a)(b)),
      // "sort-by": (key: string | Function) => (xs: any[]) =>
      //   xs
      //     .slice()
      //     .sort((a, b) =>
      //       typeof key === "function"
      //         ? key(a) > key(b)
      //           ? -1
      //           : key(b) > key(a)
      //           ? 1
      //           : 0
      //         : a[key] > b[key]
      //         ? 1
      //         : b[key] > a[key]
      //         ? -1
      //         : 0
      //     ),
    };
  })(),
  true: oddBoolean,
  false: oddBoolean,
  nothing: oddNothing,
  infinity: oddNumber,
  ...(() => {
    const eq = Symbol("Eq");
    const a = 0;
    const b = 1;
    return {
      "==": newTypeclassConstraint(
        { [stringify(a)]: eq },
        newLambdaType(a, newLambdaType(a, oddBoolean))
      ),
      "!=": newTypeclassConstraint(
        { [stringify(a)]: eq },
        newLambdaType(a, newLambdaType(a, oddBoolean))
      ),
      group: newTypeclassConstraint(
        { [stringify(b)]: eq },
        newLambdaType(
          newLambdaType(a, b, true),
          newLambdaType(
            newListType(a),
            newRecordType({
              [stringify(b)]: newGenericList(a)
            })
          )
        )
      )
    };
  })(),
  "&": newLambdaType(
    oddBoolean,
    newLambdaType(oddBoolean, oddBoolean)
  ),
  "|": newLambdaType(
    oddBoolean,
    newLambdaType(oddBoolean, oddBoolean)
  ),
  // "<.": newLambdaType(
  //   oddLambda,
  //   newLambdaType(oddLambda, oddLambda)
  // ),
  // ".>": newLambdaType(
  //   oddLambda,
  //   newLambdaType(oddLambda, oddLambda)
  // ),
  // "|>": newLambdaType(
  //   oddLambda,
  //   newLambdaType(oddLambda, 0)
  // ),
  // "<|": newLambdaType(
  //   oddLambda,
  //   newLambdaType(oddLambda, 0)
  // ),
  not: newLambdaType(oddBoolean, oddBoolean),
  range: newLambdaType(
    oddNumber,
    newListType(oddNumber)
  ),
  "range-from": newLambdaType(
    oddNumber,
    newLambdaType(oddNumber, newListType(oddNumber))
  ),
  map: newLambdaType(
    newLambdaType(0, 1, true),
    newLambdaType(newListType(0), newListType(1))
  ),
  filter: newLambdaType(
    newLambdaType(0, oddBoolean, true),
    newLambdaType(newGenericList(0), newGenericList(0))
  ),
  fold: newLambdaType(
    newLambdaType(0, newLambdaType(1, 0), true),
    newLambdaType(
      0,
      newLambdaType(newGenericList(1), 0)
    )
  ),
  foldr: newLambdaType(
    newLambdaType(0, newLambdaType(1, 1), true),
    newLambdaType(
      1,
      newLambdaType(newGenericList(0), 1)
    )
  ),
  // replace:
  //   (key: keyof any) =>
  //   (value: any) =>
  //   (target: any) => {
  //     if (Array.isArray(target)) {
  //       const clone = target.slice();
  //       clone.splice(key as number, 1, value);
  //       return clone;
  //     } else {
  //       const clone = { ...target };
  //       clone[key] = value;
  //       return clone;
  //     }
  //   },
  reverse: newLambdaType(
    newGenericList(0),
    newGenericList(0)
  ),
  head: newLambdaType(
    newGenericList(0),
    newUnionType([0, oddNothing])
  ),
  last: newLambdaType(
    newGenericList(0),
    newUnionType([0, oddNothing])
  ),
  tail: newLambdaType(
    newGenericList(0),
    newGenericList(0)
  ),
  drop: newLambdaType(
    oddNumber,
    newLambdaType(newGenericList(0), newGenericList(0))
  ),
  partition: newLambdaType(
    newLambdaType(0, oddBoolean, true),
    newLambdaType(
      newGenericList(0),
      newTupleType([
        newGenericList(0),
        newGenericList(0)
      ])
    )
  ),
  size: (() => {
    const sized = Symbol("Sized");
    const a = 0;
    return newTypeclassConstraint(
      { [stringify(a)]: sized },
      newLambdaType(a, oddNumber)
    );
  })(),
  show: (() => {
    const show = Symbol("Show");
    const a = 0;
    return newTypeclassConstraint(
      { [stringify(a)]: show },
      newLambdaType(a, oddStringType)
    );
  })(),
  import: newLambdaType(
    oddStringType,
    Symbol("Module")
  ),
  panic: newLambdaType(oddStringType, oddNever)
  // benchmark: newLambdaType(oddLambda, oddNothing),
};
