import { inspect } from "node:util";
import lexer from "./lexer.js";
import parser, { delimited, either, ignore, lexeme, node, oneOf, oneOrMore, optional, pair, rule, sequence, type, zeroOrMore } from "./parser.js";
import { compare } from "./tests.js";
inspect.styles = {
    string: "yellow",
    number: "magenta",
    bigint: "magenta",
    boolean: "magenta",
    symbol: "blue",
    undefined: "magenta",
    special: "blue",
    null: "magenta",
    date: "underline",
    regexp: "yellow",
    module: "underline"
};
export const print = (x, options) => (console.log((typeof x === "string") ? x : inspect(x, { colors: true, depth: options?.depth ?? Infinity, maxArrayLength: options?.max ?? Infinity })), x);
export const pipe = (...fs) => (x) => fs.reduce((y, f) => f(y), x);
const lex = lexer([
    { type: "comment", pattern: /;;[^\n]+/, ignore: true },
    { type: "whitespace", pattern: /\s+/, ignore: true },
    { type: "operator", pattern: /[!@#$%^&*\-=+\\|:<>/?\.]+/ },
    { type: "punctuation", pattern: /[,\[\]\{\}\(\);]/ },
    { type: "number", pattern: /-?(?:\d+(?:,\d+)*(?:\.\d+(?:e\d+)?)?|(?:\.\d+(?:e\d+)?))/i },
    { type: "string", pattern: /`[^`]+`/i },
    { type: "constant", pattern: /true|false|nothing|infinity/ },
    { type: "identifier", pattern: /[a-z]\w*(?:-\w+)*'*/i }
]);
const parse = parser({
    program: node("program")(pair(rule("statements"), optional(ignore(lexeme(";"))))),
    "statements": delimited(ignore(lexeme(";")))(node("statement")(oneOf([
        rule("type-declaration"),
    ]))),
    "type-declaration": node("type-declaration")(sequence([
        type("identifier"),
        zeroOrMore(rule("type-parameter")),
        ignore(lexeme("::")),
        rule("type")
    ])),
    "type-parameter": node("type-parameter")(either(type("identifier"), sequence([
        ignore(lexeme("(")),
        rule("type"),
        type("identifier"),
        ignore(lexeme(")"))
    ]))),
    "type": rule("type-function"),
    "type-function": node("type-function")(sequence([
        rule("type-union"),
        optional(sequence([
            ignore(lexeme("->")),
            rule("type-function")
        ]))
    ])),
    "type-union": node("type-union")(sequence([
        rule("type-intersection"),
        optional(sequence([
            ignore(lexeme("|")),
            rule("type-union")
        ]))
    ])),
    "type-intersection": node("type-intersection")(sequence([
        rule("type-application"),
        optional(sequence([
            ignore(lexeme("&")),
            rule("type-intersection")
        ]))
    ])),
    "type-application": node("type-application")(sequence([
        rule("type-literal"),
        optional(rule("type-application"))
    ])),
    "type-literal": oneOf([
        rule("literal"),
        rule("type-map"),
        rule("type-list"),
        sequence([
            ignore(lexeme("(")),
            rule("type"),
            ignore(lexeme(")"))
        ])
    ]),
    "literal": oneOf([
        type("identifier"),
        type("constant"),
        type("string"),
        type("number")
    ]),
    "type-map": sequence([
        ignore(lexeme("{")),
        zeroOrMore(rule("type-map-field")),
        ignore(lexeme("}"))
    ]),
    "type-map-field": node("type-map-field")(sequence([
        rule("type-map-key"),
        ignore(lexeme("::")),
        rule("type")
    ])),
    "type-map-key": oneOrMore(rule("literal")),
    "type-list": sequence([
        ignore(lexeme("[")),
        zeroOrMore(rule("type")),
        ignore(lexeme("]"))
    ])
});
const first = (array) => array[0];
const run = (context) => (...stages) => pipe(...stages);
const isNode = (leaf) => !!leaf.children;
const isToken = (leaf) => !leaf.children;
const traverse = (f) => {
    const traverse = (tree) => {
        if (isToken(tree))
            return;
        for (const child of tree.children.filter(isNode))
            traverse(child);
        f(tree);
    };
    return (tree) => (traverse(tree), tree);
};
const flatten = traverse(tree => {
    if (tree.children.length === 1 && isNode(tree.children[0])) {
        tree.children.splice(0, 1, ...tree.children[0].children);
    }
});
const ignoreLocation = traverse(tree => {
    tree.children.filter(isToken).forEach((token) => {
        token.location = { line: 0, char: 0 };
    });
});
const interpret = run("internal")(lex, parse, first, flatten, ignoreLocation, print, ({ children }) => print(children.slice(1).every(child => compare(child, first(children)))));
interpret(`
a :: 1 2 & 3 | 4 -> 5 | 6 & 7 8 -> 9;
a :: ((((1 2) & 3) | 4) -> ((5 | (6 & (7 8))) -> (9)));
`);
