import {
  benchmark,
  delimited,
  either,
  end,
  except,
  ignore,
  Node,
  node,
  nodel,
  oneOf,
  oneOrMore,
  optional,
  pair,
  parser,
  Parser,
  regex,
  sequence,
  string,
  unpack
} from "./combinators.js";

const ws = ignore(regex(/\s*/));

const list = (delimiter: Parser) => (parser: Parser) =>
  sequence([
    delimited(sequence([ws, delimiter, ws]))(parser),
    ws,
    optional(delimiter)
  ]);

const structure = (
  start: Parser,
  member: Parser,
  end: Parser
): Parser => sequence([start, ws, member, ws, end]);

// TODO: let/where, if-then-else, match
const parse = parser(rule => ({
  name: regex(/[a-z]+(?:-[a-z][a-z0-9]*)*/i, "name"),
  "string literal": regex(
    /"(?:[^"]|\\")*?(?<!\\)"/,
    "string"
  ),
  "number literal": regex(
    /(?:\d+(?:\d|,(?=\d))*)?\.\d+(?:e[+-]?\d+)?|\d+(?:\d|,(?=\d))*|infinity/,
    "number"
  ),
  "boolean literal": regex(/true|false/, "boolean"),
  "operator literal": except(
    regex(/->|=|:|=>|\.\.\./, "reserved operator")
  )(regex(/[~!@#$%^&*\-+=<>\./?:|\\]+/, "operator")),
  "literal literal": regex(/nothing/, "literal"),

  program: benchmark(
    node("program")(
      pair(
        either(
          oneOrMore(rule("statement")),
          rule("statement body")
        ),
        end
      )
    )
  ),
  statement: sequence([
    either(
      rule("export statement"),
      rule("statement body")
    ),
    string(";"),
    ws
  ]),
  "export statement": node("export-statement")(
    sequence([
      string("export"),
      ws,
      rule("statement body")
    ])
  ),
  "statement body": oneOf([
    rule("type declaration"),
    rule("declaration"),
    rule("expression")
  ]),
  "type declaration": node("type-declaration")(
    sequence([
      oneOrMore(pair(rule("pattern"), ws)),
      string(":"),
      ws,
      rule("type")
    ])
  ),
  type: rule("type function"),
  "type function": either(
    node("type-function")(
      sequence([
        optional(rule("type constraint")),
        rule("type operation"),
        ws,
        string("->"),
        ws,
        rule("type")
      ])
    ),
    rule("type operation")
  ),
  "type constraint": node("type-constraint")(
    sequence([
      rule("type operation"),
      ws,
      string("=>"),
      ws
    ])
  ),
  "type operation": either(
    node("type-operation")(
      sequence([
        rule("type application"),
        ws,
        regex(/[\|&]/, "type-operator"),
        ws,
        rule("type")
      ])
    ),
    rule("type application")
  ),
  "type application": either(
    nodel("type-application")(
      pair(
        rule("type literal"),
        oneOrMore(pair(ws, rule("type literal")))
      )
    ),
    rule("type literal")
  ),
  "type literal": oneOf([
    rule("type record"),
    rule("type list"),
    rule("type string"),
    rule("number literal"),
    rule("boolean literal"),
    rule("literal literal"),
    rule("name"),
    structure(string("("), rule("type"), string(")"))
  ]),
  "type record": node("type-record")(
    structure(
      string("{"),
      optional(
        list(string(","))(rule("type record field"))
      ),
      string("}")
    )
  ),
  "type record field": node("type-record-field")(
    sequence([
      either(rule("name"), rule("string")),
      ws,
      string(":"),
      ws,
      rule("type")
    ])
  ),
  "type list": node("type-list")(
    structure(
      string("["),
      optional(list(string(","))(rule("type"))),
      string("]")
    )
  ),
  // TODO: Interpolation
  "type string": rule("string literal"),

  declaration: node("declaration")(
    sequence([
      oneOrMore(pair(rule("pattern"), ws)),
      string("="),
      ws,
      rule("expression")
    ])
  ),
  expression: rule("lambda"),
  lambda: either(
    node("lambda")(
      sequence([
        rule("pattern"),
        ws,
        string("->"),
        ws,
        rule("expression")
      ])
    ),
    rule("operation")
  ),
  operation: either(
    nodel(
      "operation",
      3
    )(
      pair(
        rule("application"),
        oneOrMore(
          sequence([
            ws,
            rule("operator literal"),
            ws,
            rule("expression")
          ])
        )
      )
    ),
    rule("application")
  ),
  application: oneOf([
    nodel("partial-application")(
      pair(
        rule("operator literal"),
        oneOrMore(pair(ws, rule("atom")))
      )
    ),
    nodel("application")(
      pair(
        rule("atom"),
        oneOrMore(pair(ws, rule("atom")))
      )
    ),
    rule("atom")
  ]),
  atom: oneOf([
    rule("literal"),
    structure(
      string("("),
      rule("expression"),
      string(")")
    )
  ]),
  literal: oneOf([
    rule("record"),
    rule("list"),
    rule("string"),
    rule("number literal"),
    rule("boolean literal"),
    rule("literal literal"),
    rule("name")
  ]),
  record: node("record")(
    structure(
      string("{"),
      optional(
        list(string(","))(rule("record field"))
      ),
      string("}")
    )
  ),
  "record field": node("record-field")(
    either(
      rule("destructuring"),
      pair(
        rule("record field key"),
        optional(
          sequence([
            ws,
            string("="),
            ws,
            rule("expression")
          ])
        )
      )
    )
  ),
  "record field key": oneOf([
    rule("name"),
    rule("string")
  ]),
  destructuring: node("destructuring")(
    pair(string("..."), rule("expression"))
  ),
  list: node("list")(
    structure(
      string("["),
      optional(
        list(string(","))(
          either(
            rule("destructuring"),
            rule("expression")
          )
        )
      ),
      string("]")
    )
  ),
  // TODO: Interpolation
  string: rule("string literal"),
  pattern: rule("pattern named"),
  "pattern named": either(
    node("pattern-named")(
      sequence([
        rule("pattern operation"),
        ws,
        string("as"),
        ws,
        rule("name")
      ])
    ),
    rule("pattern operation")
  ),
  "pattern operation": either(
    node("pattern-operation")(
      sequence([
        rule("pattern atom"),
        ws,
        rule("operator literal"),
        ws,
        rule("pattern atom")
      ])
    ),
    rule("pattern atom")
  ),
  "pattern atom": oneOf([
    rule("pattern record"),
    rule("pattern list"),
    regex(/_+/, "pattern-wildcard"),
    rule("literal"),
    structure(
      string("("),
      rule("pattern"),
      string(")")
    )
  ]),
  "pattern record": node("pattern-record")(
    structure(
      string("{"),
      optional(
        list(string(","))(rule("pattern record field"))
      ),
      string("}")
    )
  ),
  "pattern record field": node("pattern-record-field")(
    pair(
      rule("pattern record field key"),
      optional(
        sequence([
          ws,
          string("="),
          ws,
          rule("pattern")
        ])
      )
    )
  ),
  "pattern record field key": oneOf([
    rule("destructuring pattern"),
    rule("name"),
    rule("string")
  ]),
  "pattern list": node("pattern-list")(
    structure(
      string("["),
      optional(
        list(string(","))(
          either(
            rule("destructuring pattern"),
            rule("pattern")
          )
        )
      ),
      string("]")
    )
  ),
  "destructuring pattern": node(
    "destructuring-pattern"
  )(pair(string("..."), rule("pattern")))
}));

export default (input: string) =>
  unpack<readonly [Node]>(parse("program")(input))[0];
