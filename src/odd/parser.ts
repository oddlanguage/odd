import { Value } from "parser/ast.js";
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
  Parser,
  run,
  sequence,
  type,
  zeroOrMore
} from "parser/parser.js";
import lex from "./lexer.js";

const ws = optional(
  ignore(
    oneOrMore(
      oneOf([type("comment"), type("whitespace")])
    )
  )
);

const listOf =
  (delimiter: Parser) => (parser: Parser) =>
    sequence([
      ws,
      delimited(sequence([ws, ignore(delimiter), ws]))(
        parser
      ),
      ws,
      optional(ignore(delimiter)),
      ws
    ]);

const commaSeparated = listOf(lexeme(","));

const program = benchmark(
  node("program")(
    sequence([
      maybe(
        listOf(lexeme(";"))(lazy(() => expression))
      ),
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
      lazy(() => lambda)
    ])
  ),
  lazy(() => declaration)
]);

const pattern = lazy(() => patternLambda);

const patternLambda = oneOf([
  node("pattern-lambda")(
    sequence([
      lazy(() => patternOperation),
      ws,
      ignore(lexeme("=>")),
      ws,
      lazy(() => patternLambda)
    ])
  ),
  lazy(() => patternOperation)
]);

const patternOperation = oneOf([
  map(children => {
    let i = 3;
    let node: Value = {
      type: "pattern-operation",
      children: children.slice(0, i)
    };
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
      lazy(() => patternApplication),
      oneOrMore(
        sequence([
          ws,
          type("operator"),
          ws,
          lazy(() => patternOperation)
        ])
      )
    ])
  ),
  lazy(() => patternApplication)
]);

const patternApplication = oneOf([
  nodeLeft("pattern-application")(
    sequence([
      lazy(() => patternLiteral),
      oneOrMore(
        sequence([ws, lazy(() => patternLiteral)])
      )
    ])
  ),
  lazy(() => patternLiteral)
]);

const patternLiteral = oneOf([
  type("wildcard"),
  lazy(() => listPattern),
  lazy(() => recordPattern),
  lazy(() => literal),
  sequence([
    ignore(lexeme("(")),
    ws,
    lazy(() => pattern),
    ws,
    ignore(lexeme(")"))
  ])
]);

const listPattern = node("list-pattern")(
  sequence([
    ignore(lexeme("[")),
    maybe(
      commaSeparated(
        oneOf([
          lazy(() => destructuring),
          lazy(() => expression)
        ])
      )
    ),
    ignore(lexeme("]"))
  ])
);

const recordPattern = node("record-pattern")(
  sequence([
    ignore(lexeme("{")),
    maybe(
      commaSeparated(lazy(() => recordPatternEntry))
    ),
    ignore(lexeme("}"))
  ])
);

const recordPatternEntry = node(
  "record-pattern-entry"
)(
  oneOf([
    lazy(() => destructuring),
    sequence([
      oneOrMore(sequence([lazy(() => pattern), ws])),
      ignore(lexeme("=")),
      ws,
      lazy(() => pattern)
    ]),
    lazy(() => literal)
  ])
);

const declaration = oneOf([
  node("declaration")(
    sequence([
      oneOrMore(sequence([lazy(() => pattern), ws])),
      ignore(lexeme("=")),
      ws,
      lazy(() => declaration)
    ])
  ),
  lazy(() => operation)
]);

const operation = oneOf([
  map(children => {
    let i = 3;
    let node: Value = {
      type: "operation",
      children: children.slice(0, i)
    };
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
      lazy(() => application),
      oneOrMore(
        sequence([
          ws,
          type("operator"),
          ws,
          lazy(() => operation)
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
    maybe(
      commaSeparated(
        oneOf([
          lazy(() => destructuring),
          lazy(() => expression)
        ])
      )
    ),
    ignore(lexeme("]"))
  ])
);

const record = node("record")(
  sequence([
    ignore(lexeme("{")),
    maybe(commaSeparated(lazy(() => recordEntry))),
    ignore(lexeme("}"))
  ])
);

const recordEntry = node("record-entry")(
  oneOf([
    lazy(() => destructuring),
    sequence([
      oneOf([
        sequence([
          lazy(() => literal),
          oneOrMore(
            sequence([ws, lazy(() => pattern)])
          )
        ]),
        sequence([
          type("name"),
          zeroOrMore(
            sequence([ws, lazy(() => pattern)])
          )
        ])
      ]),
      ws,
      ignore(lexeme("=")),
      ws,
      lazy(() => expression)
    ]),
    type("name")
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
