import lexer from "lexer/lexer.js";

const lex = lexer({
  whitespace: /\s+/,
  comment: /--[^\n]+/,
  equals: /:?=/,
  quantifier: /[*+?]/,
  string: /"(?:[^"]|\\")*?(?<!\\)"/,
  name: /[a-z]+[a-z0-9]*(?:-[a-z]+[a-z0-9]*)*/i,
  punctuation: /[(|);.:-]/
});

export default lex;
