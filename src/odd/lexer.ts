import lexer from "../lexer/lexer.js";

const lex = lexer({
  whitespace: /\s+/,
  comment: /--[^\n]+/,
  punctuation: /[()\[\]{};,]/,
  "reserved operator": /(?:=|:|[-=]>)(?=\b|\s|$)/,
  operator: /[!@#$%^&*\-+=\\:<>\.\|\/?]+/,
  wildcard: /_+/,
  number:
    /(?:\d+(?:\d|,(?=\d))*)?\.\d+(?:e[+-]?\d+)?|\d+(?:\d|,(?=\d))*/i,
  boolean: /true|false/,
  string: /`(?:[^`]|\\`)*?(?<!\\)`/,
  name: /[a-z]+[a-z0-9]*(?:-[a-z]+[a-z0-9]*)*/i
});

export default lex;
