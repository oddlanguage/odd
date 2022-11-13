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
    lazy(() => atom),
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
          lambda,
          infix,
          lazy(() => atom)
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
const expression = precedenceMatch;
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
