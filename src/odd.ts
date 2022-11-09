import {
  between,
  chain,
  choice,
  eof,
  except,
  ignore,
  label,
  lazy,
  node,
  nodeLeft,
  oneOrMore,
  pattern,
  run,
  separatedBy,
  string,
  unpack,
  _try
} from "./parser.js";

const comment = pattern(/--[^\n]+/);

const spaces = pattern(/\s+/);

const ws = _try(
  ignore(oneOrMore(choice([spaces, comment])))
);

const name = label("a name")(
  pattern(/[a-z]+\w*(?:-\w+)*/i)
);

const oddString = label("a string")(
  node("string")(pattern(/''(?:[^']|\')*?(?<!\\)''/))
);

const number = label("a number")(
  node("number")(
    pattern(
      /-?(?:\d+(?:,\d+)*(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i
    )
  )
);

const reservedOp = choice([
  string("->"),
  // TODO: Add types
  // string(":"),
  pattern(/=(?!=)/)
]);

const operator = label("an operator")(
  node("operator")(
    except(reservedOp)(
      pattern(/[-!@#$%^&*_+=:\|\/\\\.\<\>\?]+/)
    )
  )
);

const parenthesised = between(ignore(string("(")))(
  ignore(string(")"))
);

const parameters = separatedBy(ws)(lazy(() => atom));

const declaration = node("declaration")(
  chain([
    parameters,
    ws,
    ignore(string("=")),
    ws,
    lazy(() => expression)
  ])
);

const lambda = node("lambda")(
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
    lazy(() => atom),
    oneOrMore(
      chain([
        ws,
        operator,
        ws,
        choice([
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
        choice([lambda, infix, lazy(() => atom)])
      ])
    )
  ])
);

const precedenceApplication = choice([
  application,
  lazy(() => atom)
]);

const destructuring = node("destructuring")(
  chain([ignore(string("...")), lazy(() => atom)])
);

const list = node("list")(
  chain([
    ignore(string("[")),
    ws,
    _try(
      separatedBy(
        chain([ws, ignore(string(",")), ws])
      )(
        choice([destructuring, lazy(() => expression)])
      )
    ),
    ws,
    _try(ignore(string(","))),
    ws,
    ignore(string("]"))
  ])
);

const field = node("field")(
  chain([choice([destructuring, declaration, name])])
);

const record = node("record")(
  chain([
    ignore(string("{")),
    ws,
    _try(
      separatedBy(
        chain([ws, ignore(string(",")), ws])
      )(field)
    ),
    ws,
    _try(ignore(string(","))),
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

// TODO: Add types
// const type = node("type")(literal);

// TODO: Add types
const expression = precedenceLambda;
// chain([
//   lambda,
//   // TODO: Currently we can't wrap the type in a node
//   // conditionally. See if we can avoid having to parse
//   // the first part twice only to check if the last
//   // part is there, and pack it up neatly with some
//   // combinator. Or can we be lazy and when evaluating
//   // an expression, just check if its last child is a
//   // node of type "type"?
//   _try(chain([ws, ignore(string(":")), ws, type]))
// ]);

const statements = chain([
  separatedBy(chain([ws, ignore(string(";")), ws]))(
    statement
  ),
  ws,
  _try(ignore(string(";")))
]);

const program = node("program")(
  chain([ws, _try(statements), ws, eof])
);

const odd = program;

const parse = (input: string) =>
  unpack(run(odd)(input))[0]!;

export default parse;
