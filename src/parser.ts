import { inspect } from "util";

// =============== utils =======================

export const serialise = (value: any) =>
  inspect(value, false, Infinity, true);

export const prefixIndefiniteArticle = (
  thing?: string
) =>
  thing &&
  `${/^[aeuioy]/.test(thing) ? "an" : "a"} ${thing}`;

export const escapeSpecialChars = (string: string) =>
  string
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f")
    .replace(/\v/g, "\\v");

// ============== end of utils ===================

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

export type Context = Readonly<{
  offset: number;
  context: string;
}>;

export type State = Readonly<{
  [cacheKey]: number;
  input: string;
  offset: number;
  output: any[];
  grammar: Grammar;
  contexts: Context[];
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
  type: keyof any;
  children: any[];
}>;

export const isNode = (value: any): value is Node =>
  !!(value?.type && value?.children);

export const parser =
  (lang: (ref: typeof rule) => Grammar) =>
  (entrypoint: keyof Grammar) =>
  (input: string) => {
    const grammar = lang(rule);
    const {
      [entrypoint]: _,
      ...grammarWithoutEntrypoint
    } = grammar;
    return grammar[entrypoint]!({
      input,
      offset: 0,
      output: [],
      grammar: grammarWithoutEntrypoint,
      [cacheKey]: newId(),
      contexts: []
    });
  };

const rule =
  (name: keyof Grammar): Parser =>
  state => {
    if (!state.grammar[name])
      throw `Unknown grammar rule "${name}".`;

    if (cache[state[cacheKey]]?.[state.offset]?.[name])
      return cache[state[cacheKey]]![state.offset]![
        name
      ]!;

    const result = state.grammar[name]!(state);
    ((cache[state[cacheKey]] ??= {})[state.offset] ??=
      {})[name] = result;
    return result;
  };

export const done = (state: State) =>
  state.offset >= state.input.length;

const makeError = (failure: Failure) => {
  // TODO: the entire context stack gets erased since the actual failed attempt
  // is the second last result, before the parsing that is ultimately returned.
  // Any parser can write over a `Failure`, but this overwrites the last `ok` and
  // `problem` field.
  // Maybe if we find that `!parse(state).ok && !state.ok` then return
  // `state` instead of `parse(state)`?
  // const start = failure.contextStack[0] ?? failure;
  // const end =
  //   failure.contextStack[
  //     failure.contextStack.length - 1
  //   ] ?? start;
  // Although this will probably break caching functionality
  // which is already proving to be essential to keeping parse times low...
  // Maybe pass the previous context if both fail?

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
  const erroneousLine =
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
    )}^`;

  const walkContext = (failure: Failure) => {
    const stack = failure.contexts.reverse();
    return stack[0]
      ? ` while parsing ${prefixIndefiniteArticle(
          stack[0].context
        )}`
      : "";
  };

  return `${erroneousLine}\nGot stuck${walkContext(
    failure
  )}: ${failure.problem}`;
};

export const unpack = (result: Result) => {
  // TODO: Get furthest context instead of using the cache
  const cached = cache[result[cacheKey]];
  delete cache[result[cacheKey]];

  if (!done(result)) {
    // TODO: Get furthest context instead of using the cache
    const failure = (Object.values(
      Object.entries(cached ?? {}).sort(
        ([a], [b]) => Number(b) - Number(a)
      )[0]?.[1] ?? {}
    ).slice(-1)[0] as Failure) ?? {
      ...result,
      ok: false,
      problem: `Unexpected "${escapeSpecialChars(
        result.input.charAt(result.offset)
      )}".`
    };
    throw makeError(failure);
  }

  if (!result.ok) {
    // TODO: Get furthest context instead of using the cache
    throw makeError(result);
  }

  return result.output;
};

export const context =
  (context: Context["context"]) =>
  (parser: Parser): Parser =>
  state => ({
    ...parser({
      ...state,
      contexts: state.contexts.concat({
        offset: state.offset,
        context
      })
    }),
    contexts: state.contexts
  });

export const accept =
  (value: any | any[], n: number = 0) =>
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
  (problem: string) =>
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
          `Expected "${escapeSpecialChars(
            pattern
          )}" but got "${escapeSpecialChars(
            state.input.slice(
              state.offset,
              state.offset + pattern.length
            )
          )}".`
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
              )}".`
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
  state => {
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
  };

const makeNode =
  (type: Node["type"]) => (children: any[]) => ({
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
        .concat(folded[0])
    };
  };

export const nodel =
  (type: Node["type"], size: number = 2) =>
  (parser: Parser) =>
    foldl(node(type)(parser), size);

export const succeed = optional;

export const fail =
  (problem: string) =>
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
            excepted.type ??
            excepted.lexeme ??
            excepted
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

export const trace =
  (label: string) =>
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    console.log(
      serialise({
        label,
        ok: result.ok,
        offset: result.offset,
        output: result.output.slice(
          state.output.length
        )
      })
    );
    return result;
  };
