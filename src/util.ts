import { inspect } from "node:util";
import Token from "./lexer/token.js";

export const serialise = (x: any) =>
  typeof x === "string"
    ? x
    : inspect(x, false, Infinity, true);

export type Source = Readonly<{
  input: string;
  name: string;
}>;

export const redUnderline = (string: string) =>
  "\x1b[31;4m" + string + "\x1b[0m";

export const log = <T>(x: T) => {
  console.log(x);
  return x;
};

// TODO: Extract into some sort of "Problem" interface
export const makeError = (
  token: Token | undefined,
  reason: string,
  source: Source
) => {
  const problematicToken = token ?? {
    type: "EOF",
    lexeme: "",
    offset: source.input.length
  };
  const problemEnd =
    problematicToken.offset +
    problematicToken.lexeme.length -
    (problematicToken.lexeme.match(
      /^[\r\n\v\f\t]+$/
    )?.[0]?.length ?? 0);
  const startOfErroneousLine =
    source.input.lastIndexOf(
      "\n",
      problematicToken.offset
    ) + 1;
  const maybeEndOfErroneousLine = source.input.indexOf(
    "\n",
    problemEnd
  );
  const endOfErroneousLine =
    maybeEndOfErroneousLine === -1
      ? source.input.length
      : maybeEndOfErroneousLine;
  const erroneousLine = source.input.slice(
    startOfErroneousLine,
    endOfErroneousLine
  );
  const col =
    problematicToken.offset - startOfErroneousLine;
  const lineNumber = source.input
    .slice(0, endOfErroneousLine)
    .split(/\r*\n/).length;
  const linePrefix = lineNumber + " | ";
  const isNotDisplayable = /^[\r\n\v\f\t]+$/.test(
    problematicToken.lexeme
  );

  return (
    "Uh oh! Got stuck at " +
    source.name +
    ":" +
    lineNumber +
    ":" +
    col +
    "\n\n" +
    reason +
    ":\n\n" +
    linePrefix +
    erroneousLine.slice(0, col) +
    redUnderline(
      isNotDisplayable ? " " : problematicToken.lexeme
    ) +
    erroneousLine.slice(
      col + problematicToken.lexeme.length
    )
  );
};

export const escape = (input: string) =>
  input
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f")
    .replace(/\v/g, "\\v");
