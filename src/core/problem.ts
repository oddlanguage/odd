import { Type, stringify } from "./type.js";
import { ansi } from "./util.js";

export type Problem = ProblemBase &
  (
    | Expected
    | Unexpected
    | EndOfInput
    | TypeMismatch
    | Custom
  );

type ProblemBase = Readonly<{
  at: number;
  size?: number;
}>;

export type Expected = Readonly<{
  expected: string;
}>;

export type Unexpected = Readonly<{
  unexpected: string;
}>;

export type EndOfInput = Readonly<{
  endOfInput: true;
}>;

export type TypeMismatch = Readonly<{
  expected: Type;
  got: Type;
}>;

export type Custom = Readonly<{
  reason: string;
}>;

const redUnderline = (string: string) =>
  ansi.red(ansi.underline(string));

export const getLineOfProblem = (
  input: string,
  problem: Problem
) => {
  const start =
    input.lastIndexOf("\n", problem.at) + 1;
  const maybeEnd = input.indexOf("\n", problem.at);
  const end =
    maybeEnd === -1 ? input.length : maybeEnd;
  const lineContent =
    input.slice(start, problem.at) +
    redUnderline(
      input.slice(
        problem.at,
        problem.at + (problem.size ?? 1)
      ) || " ".repeat(problem.size ?? 1)
    ) +
    input.slice(problem.at + (problem.size ?? 1), end);
  const line =
    (input.slice(0, start - 1).match(/\n/g)?.length ??
      0) + 1;
  const linePrefix = ` ${line} | `;

  return `${linePrefix}${lineContent}`;
};

const furthest = (problems: ReadonlyArray<Problem>) =>
  problems.reduce(
    (furthest, problem) =>
      problem.at > (furthest[0]?.at ?? -1)
        ? problems.filter(
            ({ at }) => at === problem.at
          )
        : furthest,
    [] as Problem[]
  );

const weigh = (problem: Problem) => {
  if (
    (problem as Expected).expected ||
    (problem as TypeMismatch).got
  ) {
    return 1;
  } else if ((problem as Unexpected).unexpected) {
    return 2;
  } else if ((problem as EndOfInput).endOfInput) {
    return 3;
  }
  return 0;
};

export const makeError = (
  input: string,
  problems: ReadonlyArray<Problem>
) => {
  const prefix = `❌ Uh oh, something went wrong!`;
  const furthestProblems = furthest(problems);
  return (
    prefix +
    "\n\n" +
    getLineOfProblem(input, furthestProblems[0]!) +
    "\n\n" +
    furthestProblems
      .sort((a, b) => weigh(a) - weigh(b))
      .map(stringifyProblem)
      .join("\n")
  );
};

const stringifyProblem = (problem: Problem) => {
  if ((problem as TypeMismatch).got) {
    return `- Type mismatch\n  Expected: ${stringify(
      (problem as TypeMismatch).expected
    )}\n  Got:      ${stringify(
      (problem as TypeMismatch).got
    )}`;
  } else if ((problem as Expected).expected) {
    return `- Expected ${
      (problem as Expected).expected
    }`;
  } else if ((problem as Unexpected).unexpected) {
    return `- Unexpected ${
      (problem as Unexpected).unexpected
    }`;
  } else if ((problem as EndOfInput).endOfInput) {
    return `- Unexpected end of input (EOF)`;
  }
  return (problem as Custom).reason;
};
