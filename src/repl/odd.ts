import lexer from "../lexer/lexer.js";
import { Value } from "../parser/ast.js";
import {
  benchmark,
  delimited,
  end,
  except,
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
  comment: /--[^\n]+/,
  punctuation: /[()\[\]{};,]/,
  operator: /[!@#$%^&*\-+=\\:<>\.\/?]+/,
  wildcard: /_+/,
  number:
    /(?:\d+(?:\d|,(?=\d))*)?\.\d+(?:e[+-]?\d+)?|\d+(?:\d|,(?=\d))*/i,
  boolean: /true|false/,
  string: /`(?:[^`]|\\`)*?(?<!\\)`/,
  name: /[a-z]+[a-z0-9]*(?:-[a-z]+[a-z0-9]*)*/i
});

const ws = optional(
  ignore(oneOf([type("whitespace"), type("comment")]))
);

const program = benchmark(
  node("program")(
    sequence([
      ws,
      delimited(
        sequence([ws, ignore(lexeme(";")), ws])
      )(
        oneOf([
          lazy(() => typeDeclaration),
          lazy(() => expression)
        ])
      ),
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
      zeroOrMore(sequence([ws, lazy(() => pattern)])),
      ws,
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
      lazy(() => value),
      oneOrMore(
        sequence([
          ws,
          lazy(() => operator),
          ws,
          lazy(() => application)
        ])
      )
    ])
  ),
  lazy(() => application)
]);

const operator = except([lexeme("="), lexeme(":")])(
  type("operator")
);

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

const typePattern = oneOf([
  type("wildcard"),
  lazy(() => listTypePattern),
  lazy(() => recordTypePattern),
  lazy(() => literal)
]);

const listTypePattern = node("list-type-pattern")(
  sequence([
    ignore(lexeme("[")),
    ws,
    maybe(
      delimited(
        sequence([ws, ignore(lexeme(",")), ws])
      )(lazy(() => _type))
    ),
    ws,
    ignore(lexeme("]"))
  ])
);

const recordTypePattern = node("record-type-pattern")(
  sequence([
    ignore(lexeme("{")),
    ws,
    maybe(
      delimited(
        sequence([ws, ignore(lexeme(",")), ws])
      )(lazy(() => recordTypePatternEntry))
    ),
    ws,
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

const _type = lazy(() => typeLambda);

const typeLambda = oneOf([
  node("type-lambda")(
    sequence([
      lazy(() => typePattern),
      ws,
      ignore(lexeme("->")),
      ws,
      lazy(() => _type)
    ])
  ),
  lazy(() => typeOperation)
]);

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
      lazy(() => typeValue),
      oneOrMore(
        sequence([
          ws,
          lazy(() => operator),
          ws,
          lazy(() => typeApplication)
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
    ws,
    maybe(
      delimited(
        sequence([ws, ignore(lexeme(",")), ws])
      )(
        oneOf([
          lazy(() => typeDestructuring),
          lazy(() => _type)
        ])
      )
    ),
    ws,
    ignore(lexeme("]"))
  ])
);

const typeRecord = node("type-record")(
  sequence([
    ignore(lexeme("{")),
    ws,
    maybe(
      delimited(
        sequence([ws, ignore(lexeme(",")), ws])
      )(lazy(() => typeRecordEntry))
    ),
    ws,
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
