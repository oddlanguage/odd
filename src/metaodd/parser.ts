import {
  delimited,
  end,
  ignore,
  lazy,
  lexeme,
  maybe,
  node,
  oneOf,
  oneOrMore,
  optional,
  Parser,
  run,
  sequence,
  type
} from "../parser/parser.js";
import lex from "./lexer.js";

const ws = optional(
  ignore(
    oneOrMore(
      oneOf([type("comment"), type("whitespace")])
    )
  )
);

const isFunction = (
  x: any
): x is (...args: any[]) => any =>
  typeof x === "function";

const listOf =
  (
    delimiter: Parser,
    options?: { leading?: boolean; trailing?: boolean }
  ) =>
  (parser: Parser) =>
    sequence(
      [
        options?.leading &&
          optional(sequence([ignore(delimiter), ws])),
        delimited(
          sequence([ws, ignore(delimiter), ws])
        )(parser),
        options?.trailing &&
          optional(sequence([ws, ignore(delimiter)]))
      ].filter(isFunction)
    );

const program = node("program")(
  sequence([
    maybe(
      listOf(lexeme(";"), { trailing: true })(
        lazy(() => declaration)
      )
    ),
    end
  ])
);

const declaration = node("declaration")(
  sequence([
    type("name"),
    ws,
    type("equals"),
    ws,
    lazy(() => rule)
  ])
);

const rule = lazy(() => choice);

const choice = oneOf([
  node("choice")(
    listOf(lexeme("|"), { leading: true })(
      lazy(() => seq)
    )
  ),
  lazy(() => seq)
]);

const seq = oneOf([
  node("sequence")(
    sequence([
      lazy(() => labeled),
      oneOrMore(sequence([ws, lazy(() => labeled)]))
    ])
  ),
  lazy(() => labeled)
]);

const labeled = oneOf([
  node("labeled")(
    sequence([
      type("name"),
      ws,
      ignore(lexeme(":")),
      ws,
      lazy(() => quantified)
    ])
  ),
  lazy(() => quantified)
]);

const quantified = oneOf([
  node("quantified")(
    sequence([
      lazy(() => ignoration),
      type("quantifier")
    ])
  ),
  lazy(() => ignoration)
]);

const ignoration = oneOf([
  node("ignoration")(
    sequence([ignore(lexeme("-")), lazy(() => atom)])
  ),
  lazy(() => atom)
]);

const tipe = node("type")(
  sequence([ignore(lexeme(".")), type("name")])
);

const atom = oneOf([
  lazy(() => tipe),
  type("string"),
  type("name"),
  sequence([
    ignore(lexeme("(")),
    ws,
    lazy(() => rule),
    ws,
    ignore(lexeme(")"))
  ])
]);

export default run(program)(lex);
