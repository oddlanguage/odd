import {
  escapeSpecialChars,
  prefixIndefiniteArticle
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
    problem: string;
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
  (input: string) => {
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
        problem: `Unexpected "${escapeSpecialChars(
          String.fromCodePoint(
            result.input.codePointAt(
              result.offset + 1
            )!
          )
        )}"`
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
        problem:
          "expected to have reached the end of the input"
      };

export const getErroneousLines = (
  failure: Failure
) => {
  const maybeStartOfErrorLine =
    failure.input.lastIndexOf("\n", failure.offset);
  const startOfErrorLine =
    maybeStartOfErrorLine === failure.offset
      ? 0
      : maybeStartOfErrorLine + 1;
  const firstCharPosOfErrorLine =
    failure.input
      .slice(startOfErrorLine)
      .search(/\S/) + startOfErrorLine;
  const endOfErrorLine = failure.input.indexOf(
    "\n",
    failure.offset
  );
  const erroneousLineNumber =
    (failure.input
      .slice(0, endOfErrorLine)
      .match(/\n/g)?.length ?? 0) + 1;
  const lineIndicator = `${erroneousLineNumber} | `;

  return (
    lineIndicator +
    failure.input.slice(
      firstCharPosOfErrorLine,
      endOfErrorLine === -1
        ? failure.input.length
        : endOfErrorLine
    ) +
    `\n${" ".repeat(
      failure.offset -
        firstCharPosOfErrorLine +
        lineIndicator.length
    )}^`
  );
};

const makeError = (failure: Failure) =>
  getErroneousLines(failure) +
  "\n" +
  failure.problem +
  ".\n";

export const unpack = <T>(result: Result) => {
  delete cache[result[cacheKey]];

  if (!result.ok) {
    throw makeError({
      ...result,
      problem:
        `Got stuck trying to parse <context> in <context>: ` +
        result.problem
    });
  }

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
      : reject(
          `Expected "${escapeSpecialChars(pattern)}"`
        ))(state);

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
        : reject(
            "Expected " +
              (type
                ? prefixIndefiniteArticle(type)
                : `to match ${escapeSpecialChars(
                    pattern.toString()
                  )}`) +
              ` but got "${escapeSpecialChars(
                state.input.charAt(state.offset)
              )}"`
          )
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
      throw new Error(
        `Cannot fold a non-node value (${node}).`
      );

    const folded = node.children
      .slice(0, -1)
      .reduce(
        stack => [
          makeNode(node.type)(stack.slice(0, size)),
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
          problem: `Unexpected ${
            isNode(excepted) || isToken(excepted)
              ? excepted.type
              : isToken(excepted)
              ? excepted.lexeme
              : excepted
          }`
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
