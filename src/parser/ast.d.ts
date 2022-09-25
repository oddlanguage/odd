import Token from "lexer/token.js";

export type Tree = Readonly<{
  type: string;
  children: ReadonlyArray<Value>;
}>;

export type Value = Tree | Token | string;
