import {
  capitalise,
  prefixIndefiniteArticle
} from "./utils.js";

export type Context = string | ReadonlyArray<Context>;

export type Solution =
  | string
  | ReadonlyArray<Solution>;

export type Problem = Readonly<{
  type: string;
  reason: string;
  start: number;
  end?: number;
  context?: Context;
  solutions?: Solution;
}>;

export const stringify = (
  filename: string,
  input: string,
  problem: Problem
) => {
  const type = capitalise(problem.type) + "Error";

  const problemEnd = problem.end ?? problem.start;
  const startOfErroneousLine =
    input.lastIndexOf("\n", problem.start) + 1;
  const maybeEndOfErroneousLine = input.indexOf(
    "\n",
    problemEnd
  );
  const endOfErroneousLine =
    maybeEndOfErroneousLine === -1
      ? input.length
      : maybeEndOfErroneousLine;
  const erroneousLine = input.slice(
    startOfErroneousLine,
    endOfErroneousLine
  );
  const col = problem.start - startOfErroneousLine;
  const lineNumber = input
    .slice(0, endOfErroneousLine)
    .split(/\r*\n/).length;
  const linePrefix = lineNumber + " | ";
  const context = stringifyContext(problem.context);

  return (
    "Uh oh! " +
    prefixIndefiniteArticle(type) +
    " was raised at " +
    filename +
    ":" +
    lineNumber +
    ":" +
    col +
    "\n\n" +
    problem.reason +
    context +
    ":\n\n" +
    linePrefix +
    erroneousLine +
    "\n" +
    " ".repeat(col + linePrefix.length) +
    "^".repeat(
      Math.max(1, problemEnd - problem.start)
    ) +
    stringifySolutions(problem.solutions)
  );
};

const stringifyContext = (
  context: Context | undefined
) => {
  if (!context) return "";
  return (
    " in " +
    ([context].flat(Infinity as 0) as string[])
      .map(prefixIndefiniteArticle)
      .join(" in ")
  );
};

const stringifySolutions = (
  _solutions: Solution | undefined
) => {
  if (!_solutions) return "";
  const solutions = [_solutions].flat(
    Infinity as 0
  ) as Array<string>;
  const maxSolutionsWidth =
    solutions.length.toString().length;
  return (
    "\nMaybe the following " +
    (solutions.length === 1
      ? "solution"
      : "solutions") +
    " can help you get back on track:\n" +
    solutions
      .map(
        (solution, i) =>
          "  " +
          (i + 1)
            .toString()
            .padStart(maxSolutionsWidth, "0") +
          ") " +
          solution
      )
      .join("\n") +
    "\n"
  );
};

export const isProblem = (
  error: Problem | string
): error is Problem =>
  (error as Problem).type !== undefined &&
  (error as Problem).reason !== undefined &&
  (error as Problem).start !== undefined;
