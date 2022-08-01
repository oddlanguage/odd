import { Value } from "../parser/ast.js";
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
} from "../parser/parser.js";
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
        listOf(lexeme(";"))(
          oneOf([
            lazy(() => typeDeclaration),
            lazy(() => expression)
          ])
        )
      ),
      end
    ])
  )
);

const expression = lazy(() => lambda);

const lambda = oneOf([
  node("lambda")(
    sequence([
      optional(lazy(() => lambdaGuard)),
      lazy(() => pattern),
      ws,
      ignore(lexeme("->")),
      ws,
      lazy(() => lambda)
    ])
  ),
  lazy(() => declaration)
]);

const lambdaGuard = node("lambda-guard")(
  sequence([lazy(() => pattern), ws, lexeme("=>"), ws])
);

const declaration = oneOf([
  node("declaration")(
    sequence([
      type("name"),
      zeroOrMore(sequence([ws, lazy(() => pattern)])),
      ws,
      ignore(lexeme("=")),
      ws,
      lazy(() => declaration)
    ])
  ),
  lazy(() => operation)
]);

const pattern = lazy(() => patternApplication);

const patternApplication = oneOf([
  nodeLeft("pattern-application")(
    sequence([
      lazy(() => patternLiteral),
      oneOrMore(
        sequence([ws, lazy(() => patternLiteral)])
      )
    ])
  )
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
      lazy(() => literal),
      zeroOrMore(sequence([ws, lazy(() => pattern)])),
      ws,
      ignore(lexeme("=")),
      ws,
      lazy(() => pattern)
    ]),
    lazy(() => literal)
  ])
);

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

const typeDeclaration = node("type-declaration")(
  sequence([
    type("name"),
    zeroOrMore(
      sequence([ws, lazy(() => typePattern)])
    ),
    ws,
    ignore(lexeme(":")),
    ws,
    lazy(() => _type)
  ])
);

// TODO: type pattern lambda's?
const typePattern = lazy(() => typePatternApplication);

const typePatternApplication = oneOf([
  nodeLeft("type-pattern-application")(
    sequence([
      lazy(() => typePatternLiteral),
      oneOrMore(
        sequence([ws, lazy(() => typePatternLiteral)])
      )
    ])
  ),
  lazy(() => typePatternLiteral)
]);

const listTypePattern = node("list-type-pattern")(
  sequence([
    ignore(lexeme("[")),
    maybe(commaSeparated(lazy(() => _type))),
    ignore(lexeme("]"))
  ])
);

const recordTypePattern = node("record-type-pattern")(
  sequence([
    ignore(lexeme("{")),
    maybe(
      commaSeparated(
        lazy(() => recordTypePatternEntry)
      )
    ),
    ignore(lexeme("}"))
  ])
);

const recordTypePatternEntry = node(
  "record-type-pattern-entry"
)(
  oneOf([
    sequence([
      lazy(() => literal),
      zeroOrMore(
        sequence([ws, lazy(() => typePattern)])
      ),
      ws,
      ignore(lexeme(":")),
      ws,
      lazy(() => typePattern)
    ]),
    lazy(() => literal)
  ])
);

const typePatternLiteral = oneOf([
  type("wildcard"),
  lazy(() => listTypePattern),
  lazy(() => recordTypePattern),
  lazy(() => literal),
  sequence([
    ignore(lexeme("(")),
    ws,
    lazy(() => typePattern),
    ws,
    ignore(lexeme(")"))
  ])
]);

const _type = lazy(() => typeLambda);

const typeLambda = oneOf([
  node("type-lambda")(
    sequence([
      optional(lazy(() => typeLambdaGuard)),
      lazy(() => typePattern),
      ws,
      ignore(lexeme("->")),
      ws,
      lazy(() => typeLambda)
    ])
  ),
  lazy(() => typeOperation)
]);

const typeLambdaGuard = node("type-lambda-guard")(
  sequence([
    lazy(() => typePattern),
    ws,
    lexeme("=>"),
    ws
  ])
);

const typeOperation = oneOf([
  map(children => {
    let i = 3;
    let node: Value = {
      type: "type-operation",
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
      lazy(() => typeApplication),
      oneOrMore(
        sequence([
          ws,
          type("operator"),
          ws,
          lazy(() => typeOperation)
        ])
      )
    ])
  ),
  lazy(() => typeApplication)
]);

const typeApplication = oneOf([
  nodeLeft("type-application")(
    sequence([
      lazy(() => typeValue),
      oneOrMore(sequence([ws, lazy(() => typeValue)]))
    ])
  ),
  lazy(() => typeValue)
]);

const typeValue = oneOf([
  lazy(() => literal),
  lazy(() => typeList),
  lazy(() => typeRecord),
  sequence([
    ignore(lexeme("(")),
    ws,
    lazy(() => _type),
    ws,
    ignore(lexeme(")"))
  ])
]);

const typeList = node("type-list")(
  sequence([
    ignore(lexeme("[")),
    maybe(
      commaSeparated(
        oneOf([
          lazy(() => typeDestructuring),
          lazy(() => _type)
        ])
      )
    ),
    ignore(lexeme("]"))
  ])
);

const typeRecord = node("type-record")(
  sequence([
    ignore(lexeme("{")),
    maybe(commaSeparated(lazy(() => typeRecordEntry))),
    ignore(lexeme("}"))
  ])
);

const typeRecordEntry = node("type-record-entry")(
  oneOf([
    lazy(() => typeDestructuring),
    sequence([
      lazy(() => literal),
      zeroOrMore(
        sequence([ws, lazy(() => typePattern)])
      ),
      ws,
      ignore(lexeme(":")),
      ws,
      lazy(() => _type)
    ])
  ])
);

const typeDestructuring = node("type-destructuring")(
  sequence([ignore(lexeme("...")), lazy(() => _type)])
);

const parse = run(program)(lex);

export default parse;
