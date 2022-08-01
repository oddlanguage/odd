import Token from "../lexer/token.js";
import { Value } from "../parser/ast.js";
import {
  escape,
  makeError,
  serialise,
  Source
} from "../util.js";

export type Falsy<T> =
  | T
  | null
  | undefined
  | false
  | 0
  | ""
  | 0n;

type Maybe<T> = T | undefined;

type State = Readonly<{
  tokens: ReadonlyArray<Token>;
  offset: number;
  value: ReadonlyArray<Value>;
}>;

export type Parser = (state: State) => Result;

type Result = Success | Failure;

type Success = State &
  Readonly<{
    ok: true;
  }>;

type Failure = State &
  Readonly<{
    ok: false;
    reason: string;
  }>;

/** TODO: docs */
export const run =
  (parser: Parser) =>
  (lexer: (source: Source) => ReadonlyArray<Token>) =>
  (source: Source) => {
    const result = parser({
      tokens: lexer(source),
      offset: 0,
      value: []
    });

    if (!result.ok)
      throw makeError(
        result.tokens[result.offset]!,
        result.reason,
        source
      );

    return result.value;
  };

/** TODO: docs */
export const satisfy =
  (
    f: (token: Maybe<Token>) => Falsy<string>
  ): Parser =>
  state => {
    const peeked = state.tokens[state.offset];
    const reason = f(peeked);
    return reason
      ? {
          ...state,
          ok: false,
          reason
        }
      : {
          ...state,
          ok: true,
          offset: state.offset + 1,
          value: peeked
            ? state.value.concat(peeked)
            : state.value
        };
  };

/** TODO: docs */
const prefixIndefiniteArticle = (
  string: string | undefined
) =>
  string
    ? (/^[aeiou]/.test(string) ? "an " : "a ") +
      escape(string)
    : "";

/** TODO: docs */
export const type =
  (type: Token["type"]): Parser =>
  state =>
    satisfy(
      next =>
        next?.type !== type &&
        `Expected ${prefixIndefiniteArticle(
          type
        )} but ${
          next
            ? `got ${prefixIndefiniteArticle(
                next.type
              )}`
            : "reached end of input"
        }`
    )(state);

/** TODO: docs */
export const lexeme =
  (lexeme: Token["lexeme"]): Parser =>
  state =>
    satisfy(
      next =>
        next?.lexeme !== lexeme &&
        `Expected "${escape(lexeme)}" but ${
          next
            ? `got "${escape(next.lexeme)}"`
            : "reached end of input"
        }`
    )(state);

/** TODO: docs */
export const sequence =
  (parsers: ReadonlyArray<Parser>): Parser =>
  state => {
    let result = state as Result;
    for (const parser of parsers) {
      result = parser(result);
      if (!result.ok) break;
    }
    return result;
  };

/** TODO: docs */
export const oneOf =
  (parsers: ReadonlyArray<Parser>): Parser =>
  state => {
    let furthest = state as Result;
    for (const parser of parsers) {
      const result = parser(state);
      if (result.ok) return result;
      if (result.offset >= furthest.offset)
        furthest = result;
    }
    return furthest;
  };

/** TODO: docs */
export const lazy =
  (parser: () => Parser): Parser =>
  state =>
    parser()(state);

/** TODO: docs */
export const optional =
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    return result.ok ? result : { ...state, ok: true };
  };

/** TODO: docs */
export const ignore =
  (parser: Parser): Parser =>
  state => ({
    ...parser(state),
    value: state.value
  });

/** TODO: docs */
export const end = (state: State): Result =>
  state.offset >= state.tokens.length
    ? { ...state, ok: true }
    : {
        ...state,
        ok: false,
        reason: `Unexpected ${escape(
          state.tokens[state.offset]!.type
        )} "${escape(
          state.tokens[state.offset]!.lexeme
        )}"`
      };

/** TODO: docs */
export const benchmark =
  (parser: Parser): Parser =>
  state => {
    const before = performance.now();
    const result = parser(state);
    console.log(
      `Took ${(performance.now() - before).toFixed(
        2
      )}ms`
    );
    return result;
  };

/** TODO: docs */
export const trace =
  (label: string) =>
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    console.log(
      result.ok
        ? `✅ ${label} ${serialise(result)}`
        : `❌ ${label} ${serialise(result)}`
    );
    return result;
  };

/** TODO: docs */
export const zeroOrMore =
  (parser: Parser, maxDepth = 1000): Parser =>
  state => {
    let depth = 0;
    let [prev, result] = [
      state as Result,
      state as Result
    ];
    while (true) {
      [prev, result] = [result, parser(result)];
      if (!result.ok) break;
      if (depth++ > maxDepth)
        return {
          ...result,
          ok: false,
          reason: `Parser exceeded maximum depth (${maxDepth})`
        };
    }
    return prev;
  };

/** TODO: docs */
export const oneOrMore = (parser: Parser) =>
  sequence([parser, zeroOrMore(parser)]);

/** TODO: docs */
export const delimited =
  (delimiter: Parser) => (parser: Parser) =>
    sequence([
      parser,
      zeroOrMore(sequence([delimiter, parser]))
    ]);

/** Map the [value] of some [State] to another value
 * and warpping it in a [State].
 */
export const map =
  (f: (value: State["value"]) => Value) =>
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    if (!result.ok) return result;

    const endOfPreviousValue = -Math.max(
      0,
      result.value.length - state.value.length
    );
    return {
      ...result,
      ok: true,
      value: state.value.concat(
        f(result.value.slice(endOfPreviousValue))
      )
    };
  };

/** Given a Success with a flat list of values,
 * wrap all those values into a node of type [type]
 * with its children being the previously matched values
 */
export const node = (type: string) =>
  map(children => ({ type, children }));

/** Given a Success with a flat list of values,
 * recursively wraps it in nodes with type [type] with
 * left associativity
 */
export const nodeLeft = (
  type: string,
  size: number = 2
) =>
  map(children => {
    let i = size;
    let node: Value = {
      type,
      children: children.slice(0, i).reverse()
    };
    while (i < children.length) {
      node = {
        type,
        children: [
          ...children.slice(i, i + size - 1),
          node
        ] as ReadonlyArray<Value>
      };
      i += size - 1;
    }
    return node as Value;
  });

/** A parser that will always fail with the message
 * that it is not yet implemented.
 */
export const todo: Parser = state => ({
  ...state,
  ok: false,
  reason: "Not implemented yet"
});

/** Like [optional] but discards any values if nothing
 * was matched.
 */
export const maybe =
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    return result.ok
      ? result
      : { ...state, ok: true, value: [] };
  };
