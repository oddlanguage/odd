// https://hackage.haskell.org/package/parsec-3.1.15.1/docs/Text-Parsec.html#v:-60--42-

import {
  redUnderline,
  serialise,
  unique
} from "./util.js";

type Parser = (input: State) => Result;

type Result = State & (Success | Failure);

type State = Readonly<{
  input: string;
  offset: number;
}>;

type Success = Readonly<{
  ok: true;
  value: ReadonlyArray<Tree>;
}>;

type Problem = ProblemBase &
  (Expected | Unexpected | EndOfInput | Custom);

type ProblemBase = Readonly<{
  at: number;
  size?: number;
}>;

type Expected = Readonly<{
  expected: string;
}>;

type Unexpected = Readonly<{
  unexpected: string;
}>;

type EndOfInput = Readonly<{
  endOfInput: true;
}>;

type Custom = Readonly<{
  reason: string;
}>;

type Failure = Readonly<{
  ok: false;
  problems: ReadonlyArray<Problem>;
}>;

export type Token = Readonly<{
  type?: string | undefined;
  text: string;
  offset: number;
}>;

export type Tree = Branch | Token;

export type Branch = Readonly<{
  type: string;
  children: ReadonlyArray<Tree>;
}>;

export const run =
  (parser: Parser) =>
  (input: string, offset = 0) =>
    parser({
      input,
      offset
    });

export const string =
  (string: string, type?: string): Parser =>
  state => {
    if (state.input.length <= state.offset)
      return {
        ...state,
        ok: false,
        problems: [
          { endOfInput: true, at: state.offset }
        ]
      };

    return state.input
      .slice(state.offset)
      .startsWith(string)
      ? {
          ...state,
          ok: true,
          offset: state.offset + string.length,
          value: [
            {
              type,
              text: string,
              offset: state.offset
            }
          ]
        }
      : {
          ...state,
          ok: false,
          problems: [
            {
              expected: `"${string}"`,
              at: state.offset
            }
          ]
        };
  };

export const pattern = (
  pattern: RegExp,
  type?: string
): Parser => {
  const compiledPattern = new RegExp(
    `^(?:${pattern.source})`,
    pattern.flags
  );
  return state => {
    if (state.input.length <= state.offset)
      return {
        ...state,
        ok: false,
        problems: [
          { endOfInput: true, at: state.offset }
        ]
      };

    const match = state.input
      .slice(state.offset)
      .match(compiledPattern)?.[0];
    return match !== undefined
      ? {
          ...state,
          ok: true,
          offset: state.offset + match.length,
          value: [
            { type, text: match, offset: state.offset }
          ]
        }
      : {
          ...state,
          ok: false,
          problems: [
            {
              unexpected: `"${state.input[
                state.offset
              ]!}"`,
              at: state.offset
            }
          ]
        };
  };
};

export const label =
  (label: string) =>
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    return result.ok || state.offset !== result.offset
      ? result
      : {
          ...result,
          problems: [
            ...result.problems.filter(
              problem => (problem as Expected).expected
            ),
            { expected: label, at: state.offset }
          ]
        };
  };

export const pair =
  (a: Parser, b: Parser): Parser =>
  state => {
    const result = a(state);
    if (!result.ok) return result;
    const second = b(result);
    return second.ok
      ? {
          ...second,
          value: result.value.concat(second.value)
        }
      : second;
  };

export const chain =
  (parsers: ReadonlyArray<Parser>): Parser =>
  state =>
    parsers.reduce(pair)(state);

export const _try =
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    return result.ok
      ? result
      : { ...state, value: [], ok: true };
  };

export const fail =
  (reason: string): Parser =>
  state => ({
    ...state,
    ok: false,
    problems: [{ reason, at: state.offset }]
  });

export const either =
  (a: Parser, b: Parser): Parser =>
  state => {
    const result = a(state);
    if (result.ok) return result;
    const second = b(state);
    return second.ok
      ? second
      : {
          ...second,
          problems: unique(
            [result.problems]
              .concat(second.problems)
              .flat()
          )
        };
  };

export const choice =
  (parsers: ReadonlyArray<Parser>): Parser =>
  state =>
    parsers.reduce(either)(state);

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

export const eof: Parser = state =>
  state.offset >= state.input.length
    ? {
        ...state,
        ok: true,
        value: []
      }
    : {
        ...state,
        ok: false,
        problems: [
          {
            unexpected: `"${state.input[
              state.offset
            ]!}"`,
            at: state.offset
          }
        ]
      };

export const ignore =
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    return result.ok
      ? { ...result, value: [] }
      : result;
  };

export const getLineOfProblem =
  (failure: State & Failure) => (problem: Problem) => {
    const start =
      failure.input.lastIndexOf("\n", problem.at) + 1;
    const maybeEnd = failure.input.indexOf(
      "\n",
      problem.at
    );
    const end =
      maybeEnd === -1
        ? failure.input.length
        : maybeEnd;
    const lineContent =
      failure.input.slice(start, problem.at) +
      redUnderline(
        failure.input.slice(
          problem.at,
          problem.at + (problem.size ?? 1)
        ) ?? " ".repeat(problem.size ?? 1)
      ) +
      failure.input.slice(
        problem.at + (problem.size ?? 1),
        end
      );
    const line =
      (failure.input.slice(0, start - 1).match(/\n/g)
        ?.length ?? 0) + 1;
    const linePrefix = ` ${line} | `;

    return `${linePrefix}${lineContent}`;
  };

export const makeError = (failure: State & Failure) =>
  `❌ Uh oh!\n\n` +
  failure.problems
    .map(
      problem =>
        stringifyProblem(problem) +
        "\n" +
        getLineOfProblem(failure)(problem)
    )
    .join("\n\n");

const stringifyProblem = (problem: Problem) => {
  if ((problem as Expected).expected) {
    return `Expected ${
      (problem as Expected).expected
    }`;
  } else if ((problem as Unexpected).unexpected) {
    return `Unexpected ${
      (problem as Unexpected).unexpected
    }`;
  } else if ((problem as EndOfInput).endOfInput) {
    return `Unexpected end of input (EOF)`;
  }
  return (problem as Custom).reason;
};

export const unpack = (result: Result) => {
  if (!result.ok) throw makeError(result);
  return result.value;
};

export const map =
  (f: (value: Success["value"]) => Success["value"]) =>
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    return result.ok
      ? {
          ...result,
          value: f(result.value)
        }
      : result;
  };

export const node = (type: string) =>
  map(children => [{ type, children }]);

export const nodeLeft = (type: string, size = 2) =>
  map(children => {
    let i = size;
    let node: Branch = {
      type,
      children: children.slice(0, i)
    };
    const step = Math.max(1, size - 1);
    while (i < children.length) {
      node = {
        type,
        children: [
          node,
          ...children.slice(i, i + step)
        ] as ReadonlyArray<Branch>
      };
      i += step;
    }
    return [node as Branch];
  });

export const oneOrMore =
  (parser: Parser): Parser =>
  state =>
    chain([parser, _try(oneOrMore(parser))])(state);

export const zeroOrMore = (parser: Parser) =>
  _try(oneOrMore(parser));

export const trace =
  (parser: Parser): Parser =>
  state => {
    const result = parser(state);
    console.log(serialise(result));
    return result;
  };

export const between =
  (start: Parser) =>
  (end: Parser) =>
  (parser: Parser) =>
    chain([start, parser, end]);

export const lazy =
  (parser: () => Parser): Parser =>
  state =>
    parser()(state);

export const separatedBy =
  (sep: Parser) => (parser: Parser) =>
    chain([parser, zeroOrMore(chain([sep, parser]))]);

export const except =
  (exception: Parser) =>
  (parser: Parser): Parser =>
  state => {
    const result = exception(state);
    return result.ok
      ? {
          ...state,
          ok: false,
          problems: [
            {
              unexpected: state.input[state.offset]!,
              at: state.offset
            }
          ]
        }
      : parser(state);
  };
