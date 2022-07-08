import { Problem } from "./problem.js";
import {
  escapeSpecialChars,
  prefixIndefiniteArticle,
  serialise
} from "./utils.js";

let id = 0;
const newId = () => id++;
const cache: Record<
  number,
  Record<
    State["offset"],
    Record<keyof Grammar, Result>
  >
> = {};
const cacheKey = Symbol("cacheKey");

// TODO: Make context combinator to inject context information
export type State = Readonly<{
  [cacheKey]: number;
  input: string;
  offset: number;
  output: Array<Node | Token | string>;
  grammar: Grammar;
}>;

export type Grammar = Readonly<Record<string, Parser>>;

export type Parser = (state: State) => Result;

export type Result = Success | Failure;

export type Success = State &
  Readonly<{
    ok: true;
  }>;

export type Failure = State &
  Readonly<{
    ok: false;
    problem: Problem;
  }>;

export type Node = Readonly<{
  type: string;
  children: Array<Node | Token | string>;
}>;

export type Token = Readonly<{
  type: string;
  lexeme: string;
  offset: number;
}>;

export const isNode = (value: any): value is Node =>
  !!(
    typeof value?.type === "string" &&
    Array.isArray(value?.children)
  );

export const isToken = (value: any): value is Token =>
  !!(
    typeof value?.type === "string" &&
    typeof value?.lexeme === "string" &&
    typeof value?.offset === "number"
  );

export const parser =
  (construct: (_rule: typeof rule) => Grammar) =>
  (entrypoint: keyof Grammar) =>
  (input: string): Result => {
    const grammar = construct(rule);
    const result = grammar[entrypoint]!({
      input,
      offset: 0,
      output: [],
      grammar,
      [cacheKey]: newId()
    });

    if (!done(result)) {
      return {
        ...result,
        ok: false,
        offset: result.offset + 1,
        problem: {
          type: "parse",
          reason: `Unexpected "${escapeSpecialChars(
            String.fromCodePoint(
              result.input.codePointAt(
                result.offset + 1
              )!
            )
          )}"`,
          start: result.offset + 1,
          solutions: [
            // TODO: Provide actual solutions
            "Try removing the character, lol.",
            [[[[["Don't write bad code?"]]]]],
            [
              "This is just a test of the problem system, please don't be mad :("
            ]
          ]
        }
      };
    }

    return result;
  };

export const memoise =
  (key: string) =>
  (parser: Parser): Parser =>
  state => {
    if (
      cache[state[cacheKey]]?.[state.offset]?.[key]
    ) {
      return cache[state[cacheKey]]![state.offset]![
        key
      ]!;
    }

    const result = parser(state);
    ((cache[state[cacheKey]] ??= {})[state.offset] ??=
      {})[key] = result;
    return result;
  };

const rule =
  (name: keyof Grammar): Parser =>
  state => {
    if (!state.grammar[name])
      throw `Unknown grammar rule "${name}".`;

    return state.grammar[name]!(state);
  };

export const done = (state: State) =>
  state.offset >= state.input.length;

export const end: Parser = (state: State) =>
  done(state)
    ? { ...state, ok: true }
    : {
        ...state,
        ok: false,
        problem: {
          type: "parse",
          reason:
            "expected to have reached the end of the input",
          start: state.offset
        }
      };

export const unpack = <T>(result: Result) => {
  delete cache[result[cacheKey]];
  if (!result.ok) throw result.problem;
  return result.output as any as T;
};

export const accept =
  (
    value: State["output"][number] | State["output"],
    n: number = 0
  ) =>
  (state: State): Success => ({
    ...state,
    ok: true,
    offset: state.offset + n,
    output: state.output.concat(value)
  });

export const advance =
  (n: number) =>
  (state: State): Result => ({
    ...state,
    ok: true,
    offset: state.offset + n
  });

export const reject =
  (problem: Failure["problem"]) =>
  (state: State): Failure => ({
    ...state,
    ok: false,
    problem
  });

export const string =
  (pattern: string): Parser =>
  state =>
    (state.input.startsWith(pattern, state.offset)
      ? advance(pattern.length)
      : reject({
          type: "parse",
          reason: `Expected "${escapeSpecialChars(
            pattern
          )}"`,
          start: state.offset,
          end: state.offset + pattern.length
        }))(state);

export const regex = (
  pattern: RegExp,
  type?: string
): Parser => {
  if (pattern.global)
    console.error(
      `Warning: using a global regex is not supported (${pattern}), removing "g" flag.`
    );

  const sanitised = new RegExp(
    pattern.source,
    (pattern.sticky
      ? pattern.flags
      : pattern.flags + "y"
    ).replace(/g/, "")
  );

  return state => {
    sanitised.lastIndex = state.offset;
    const match = state.input.match(sanitised)?.[0];
    return (
      match !== undefined
        ? accept(
            type
              ? {
                  type,
                  lexeme: match,
                  offset: state.offset
                }
              : match,
            match.length
          )
        : reject({
            type: "parse",
            reason:
              "Expected " +
              (type
                ? prefixIndefiniteArticle(type)
                : `to match ${escapeSpecialChars(
                    pattern.toString()
                  )}`) +
              ` but got "${escapeSpecialChars(
                state.input.charAt(state.offset)
              )}"`,
            start: state.offset
          })
    )(state);
  };
};

export const pair =
  (a: Parser, b: Parser): Parser =>
  state => {
    const result = a(state);
    return result.ok ? b(result) : result;
  };

export const sequence = (parsers: Parser[]) =>
  parsers.reduce(pair);

export const either =
  (a: Parser, b: Parser): Parser =>
  state => {
    const result = a(state);
    return result.ok ? result : b(state);
  };

export const oneOf = (parsers: Parser[]) =>
  parsers.reduce(either);

export const ignore =
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    return { ...result, output: state.output };
  };

export const zeroOrMore =
  (parser: Parser): Parser =>
  state => {
    let [prev, result] = [state, state] as [
      Result,
      Result
    ];

    while (true) {
      [prev, result] = [result, parser(result)];
      if (!result.ok) break;
    }

    return prev;
  };

export const oneOrMore = (parser: Parser) =>
  pair(parser, zeroOrMore(parser));

export const delimited =
  (delimiter: Parser) => (parser: Parser) =>
    pair(parser, zeroOrMore(pair(delimiter, parser)));

export const optional =
  (parser: Parser) =>
  (state: State): Success => {
    const result = parser(state);
    return result.ok ? result : { ...state, ok: true };
  };

export const node =
  (type: Node["type"]) =>
  (parser: Parser): Parser =>
    memoise(type)(state => {
      const result = parser(state);
      if (!result.ok) return result;

      return {
        ...result,
        output: state.output.concat({
          type,
          children: result.output.slice(
            state.output.length
          )
        })
      };
    });

const makeNode =
  (type: Node["type"]) =>
  (children: State["output"]) => ({
    type,
    children
  });

// TODO: Could we automatically determine the size?
const foldl =
  (parser: Parser, size: number = 2): Parser =>
  state => {
    const result = parser(state);

    if (!result.ok) return result;

    const node =
      result.output[result.output.length - 1];
    if (!isNode(node))
      throw `Cannot fold a non-node value (${node}).`;

    const folded =
      node.children.length === size
        ? [node]
        : node.children
            .slice(0, -1)
            .reduce(
              stack => [
                makeNode(node.type)(
                  stack.slice(0, size)
                ),
                ...stack.slice(size)
              ],
              node.children
            );

    return {
      ...result,
      output: result.output
        .slice(0, -1)
        .concat(folded[0]!)
    };
  };

export const nodel =
  (type: Node["type"], size: number = 2) =>
  (parser: Parser) =>
    memoise(type)(foldl(node(type)(parser), size));

export const succeed = optional;

export const fail =
  (problem: Failure["problem"]) =>
  (parser: Parser): Parser =>
  state => ({
    ...parser(state),
    ok: false,
    problem
  });

export const except =
  (exceptions: Parser | Parser[]) =>
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    if (!result.ok) return result;

    for (const exception of [exceptions].flat()) {
      const shouldFail = exception(state);
      if (shouldFail.ok) {
        const excepted =
          shouldFail.output[
            shouldFail.output.length - 1
          ];
        return {
          ...state,
          ok: false,
          problem: {
            type: "parse",
            reason:
              (isNode(excepted) || isToken(excepted)
                ? prefixIndefiniteArticle(
                    excepted.type
                  )
                : isToken(excepted)
                ? `"${excepted.lexeme}"`
                : `"${excepted}"`) +
              " is not allowed here",
            start: state.offset,
            solutions: "Consider removing it."
          }
        };
      }
    }

    return result;
  };

export const benchmark =
  (parser: Parser): Parser =>
  state => {
    const memory = process.memoryUsage().heapUsed;
    const before = performance.now();
    const result = parser(state);
    const elapsed = (
      performance.now() - before
    ).toFixed(3);
    const used = Math.round(
      (process.memoryUsage().heapUsed - memory) / 1024
    );

    console.log(
      `Took ${elapsed}ms and used ${used}kb.`
    );

    return result;
  };

export const trace =
  (options: Array<keyof Result>) =>
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);

    console.log(
      serialise(
        Object.fromEntries(
          options.map(key => [key, result[key]])
        )
      )
    );

    return result;
  };
