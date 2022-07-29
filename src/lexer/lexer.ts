import Token from "./token.js";

type Pattern = RegExp | string;

const lexer =
  (rules: Record<string, Pattern>) =>
  (input: string) => {
    let offset = 0;
    const tokens: Token[] = [];
    chomper: while (true) {
      for (const [type, pattern] of Object.entries(
        rules
      )) {
        if (input === "") break chomper;

        if (typeof pattern === "string") {
          if (input.startsWith(pattern)) {
            tokens.push({
              type,
              lexeme: pattern
            } as Token);
            input = input.slice(pattern.length);
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
            } as Token);
            input = input.slice(match.length);
            offset += match.length;
            continue chomper;
          }
        }
      }

      throw `Unexpected lexeme "${String.fromCodePoint(
        input.codePointAt(0)!
      )}".`;
    }
    return tokens;
  };

export default lexer;
