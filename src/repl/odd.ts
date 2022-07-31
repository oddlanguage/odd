import lexer from "../lexer/lexer.js";
import { Value } from "../parser/ast";
import {
  benchmark,
  delimited,
  end,
  ignore,
  lazy,
  lexeme,
  map,
  maybe,
  node,
  nodeLeft,
  oneOf,
  oneOrMore,
  optional,
  run,
  sequence,
  type,
  zeroOrMore
} from "../parser/parser.js";

const lex = lexer({
  whitespace: /\s+/,
  punctuation: /[()\[\]{};,]/,
  operator: /[!@#$%^&*\-+=\\:<>\.\/?]+/,
  wildcard: /_+/,
  number:
    /(?:\d+(?:\d|,(?=\d))*)?\.\d+(?:e[+-]?\d+)?|\d+(?:\d|,(?=\d))*/i,
  boolean: /true|false/,
  string: /`(?:[^`]|\\`)*?(?<!\\)`/,
  name: /[a-z]+[a-z0-9]*(?:-[a-z]+[a-z0-9]*)*/i
});

const ws = optional(ignore(type("whitespace")));

const program = benchmark(
  node("program")(
    sequence([
      ws,
      delimited(
        sequence([ws, ignore(lexeme(";")), ws])
      )(lazy(() => expression)),
      ws,
      optional(ignore(lexeme(";"))),
      ws,
      end
    ])
  )
);

const expression = lazy(() => lambda);

const lambda = oneOf([
  node("lambda")(
    sequence([
      lazy(() => pattern),
      ws,
      ignore(lexeme("->")),
      ws,
      lazy(() => expression)
    ])
  ),
  lazy(() => declaration)
]);

const declaration = oneOf([
  node("declaration")(
    sequence([
      type("name"),
      zeroOrMore(
        sequence([ws, lazy(() => pattern), ws])
      ),
      ignore(lexeme("=")),
      ws,
      lazy(() => expression)
    ])
  ),
  lazy(() => operation)
]);

const pattern = oneOf([
  type("wildcard"),
  lazy(() => listPattern),
  lazy(() => recordPattern),
  lazy(() => literal)
]);

const listPattern = node("list-pattern")(
  sequence([
    ignore(lexeme("[")),
    ws,
    maybe(
      delimited(
        sequence([ws, ignore(lexeme(",")), ws])
      )(
        oneOf([
          lazy(() => destructuring),
          lazy(() => expression)
        ])
      )
    ),
    ws,
    ignore(lexeme("]"))
  ])
);

const recordPattern = node("record-pattern")(
  sequence([
    ignore(lexeme("{")),
    ws,
    maybe(
      delimited(
        sequence([ws, ignore(lexeme(",")), ws])
      )(lazy(() => recordPatternEntry))
    ),
    ws,
    ignore(lexeme("}"))
  ])
);

const recordPatternEntry = node(
  "record-pattern-entry"
)(
  oneOf([
    lazy(() => destructuring),
    sequence([
      type("name"),
      ws,
      ignore(lexeme("=")),
      ws,
      lazy(() => pattern)
    ]),
    lazy(() => literal)
  ])
);

// TODO: Match left to right
const operation = oneOf([
  map(children => {
    let node: Value = {
      type: "operation",
      children: children.slice(0, 3)
    };

    let i = 3;
    while (i < children.length) {
      node = {
        type: node.type,
        children: [
          node,
          ...children.slice(i, i + 2)
        ] as ReadonlyArray<Value>
      };
      i += 2;
    }

    return node;
  })(
    sequence([
      lazy(() => value),
      oneOrMore(
        sequence([
          ws,
          type("operator"),
          ws,
          lazy(() => application)
        ])
      )
    ])
  ),
  lazy(() => application)
]);

const application = oneOf([
  nodeLeft("application")(
    sequence([
      lazy(() => value),
      oneOrMore(sequence([ws, lazy(() => value)]))
    ])
  ),
  lazy(() => value)
]);

const value = oneOf([
  lazy(() => literal),
  lazy(() => list),
  lazy(() => record),
  sequence([
    ignore(lexeme("(")),
    ws,
    lazy(() => expression),
    ws,
    ignore(lexeme(")"))
  ])
]);

const list = node("list")(
  sequence([
    ignore(lexeme("[")),
    ws,
    maybe(
      delimited(
        sequence([ws, ignore(lexeme(",")), ws])
      )(
        oneOf([
          lazy(() => destructuring),
          lazy(() => expression)
        ])
      )
    ),
    ws,
    ignore(lexeme("]"))
  ])
);

const record = node("record")(
  sequence([
    ignore(lexeme("{")),
    ws,
    maybe(
      delimited(
        sequence([ws, ignore(lexeme(",")), ws])
      )(lazy(() => recordEntry))
    ),
    ws,
    ignore(lexeme("}"))
  ])
);

const recordEntry = node("record-entry")(
  oneOf([
    lazy(() => destructuring),
    sequence([
      type("name"),
      ws,
      zeroOrMore(sequence([lazy(() => pattern), ws])),
      ignore(lexeme("=")),
      ws,
      lazy(() => expression)
    ]),
    lazy(() => literal)
  ])
);

const destructuring = node("destructuring")(
  sequence([
    ignore(lexeme("...")),
    lazy(() => expression)
  ])
);

const literal = oneOf([
  type("name"),
  type("string"),
  type("number"),
  type("boolean")
]);

const parse = run(program)(lex);

export default parse;
