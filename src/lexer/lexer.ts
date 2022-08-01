import { makeError, Source } from "../util.js";
import Token from "./token.js";

type Pattern = RegExp | string;

const lexer =
  (rules: Record<string, Pattern>) =>
  (source: Source) => {
    let offset = 0;
    const tokens: Token[] = [];
    let { input } = source;
    chomper: while (true) {
      for (const [type, pattern] of Object.entries(
        rules
      )) {
        if (input === "") break chomper;

        if (typeof pattern === "string") {
          if (input.startsWith(pattern)) {
            tokens.push({
              type,
              lexeme: pattern,
              offset
            });
            input = input.slice(pattern.length);
            offset += pattern.length;
            continue chomper;
          }
        } else {
          const match = input.match(
            new RegExp(
              `^(?:${pattern.source})`,
              pattern.flags.replace("g", "")
            )
          )?.[0];
          if (match !== undefined) {
            tokens.push({
              type,
              lexeme: match,
              offset
            });
            input = input.slice(match.length);
            offset += match.length;
            continue chomper;
          }
        }
      }

      const unexpected = String.fromCodePoint(
        input.codePointAt(0)!
      )!;
      throw makeError(
        {
          type: "unknown",
          lexeme: unexpected,
          offset
        },
        `Unexpected lexeme "${unexpected}"`,
        source
      );
    }

    return tokens;
  };

export default lexer;
