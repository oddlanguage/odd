

import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { inspect } from "node:util";
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
export const range = (n) => Array.from(Array(n).keys());
export const constant = (x) => () => x;
export const prefixIndefiniteArticle = (thing) => thing &&
    `${/^[aeuioy]/.test(thing) ? "an" : "a"} ${thing}`;
export const print = (x, options) => {
    console.log(typeof x === "string"
        ? x
        : inspect(x, {
            colors: true,
            depth: options?.depth ?? Infinity,
            maxArrayLength: options?.max ?? Infinity,
            compact: !!options?.compact
        }));
    return x;
};
export const pipe = (...fs) => (x) => fs.reduce((y, f) => f(y), x);
export const first = (array) => array[0];
export const kebabToCamel = (identifier) => identifier.replace(/-\w/g, ([_, x]) => x.toUpperCase());
export const capitalise = (x) => String.fromCodePoint(x.codePointAt(0)).toLocaleUpperCase() + x.slice(1);
export const last = (target) => target[target.length - 1];
export const zip = (xs) => (ys) => xs.map((x, i) => [x, ys[i]]);
export const mapObject = (f) => (x) => Object.fromEntries(Object.entries(x).map(f));
export const read = (path, encoding = "utf-8") => readFile(path, { encoding }).then(contents => ({
    path: join(dirname(fileURLToPath(import.meta.url)), "..", path),
    contents
}));
export const write = (path, contents) => writeFile(path, contents);
const ensureRegex = (pattern) => typeof pattern === "string"
    ? new RegExp(`^(?:${pattern})`)
    : new RegExp(`^(?:${pattern.source})`, pattern.flags);
const compile = (rule) => (input) => {
    const match = input.match(ensureRegex(rule.pattern))?.[0];
    return (match && {
        type: rule.type,
        lexeme: match,
        ignore: rule.ignore
    });
};
const applyTo = (x) => (f) => f(x);
const didMatch = (result) => !!result;
const biggestBy = (f) => (a, b) => f(a) >= f(b) ? a : b;
export const stringify = (token) => token && `${token.type} "${token.lexeme}"`;
const lexer = (rules) => {
    const matchers = rules.map(compile);
    const lex = (input) => {
        const tokens = [];
        let offset = 0;
        let eaten = 0;
        while ((input = input.slice(eaten)).length) {
            const matches = matchers
                .map(applyTo(input))
                .filter(didMatch);
            if (matches.length === 0)
                throw {
                    offset,
                    message: `Unknown lexeme "${input.charAt(0)}"`
                };
            const longest = matches.reduce(biggestBy(match => match.lexeme.length));
            if (!longest.ignore) {
                tokens.push({
                    type: longest.type,
                    lexeme: longest.lexeme,
                    offset
                });
            }
            eaten = longest.lexeme.length;
            offset += eaten;
        }
        return tokens;
    };
    return lex;
};

export const done = (result) => result.ok && result.input.length === 0;
const parser = (entrypoint, construct) => (input) => {
    const grammar = construct(rule);
    return grammar[entrypoint]({
        input,
        grammar,
        stack: [],
        cache: {},
        offset: 0
    });
};

export const peek = (state) => state.input[0];
export const unpack = (result) => {
    if (result.ok)
        return result.stack[0];
    throw result.reason;
};
const rule = (name) => (state) => {
    if (!state.grammar[name])
        throw `Unknown grammar rule "${name}".`;
    if (!state.cache[state.offset])
        state.cache[state.offset] = {};
    return (state.cache[state.offset][name] ??=
        state.grammar[name](state));
};
export const succeed = (n) => (state) => state.input.length === 0
    ? { ...state, ok: true }
    : {
        ...state,
        ok: true,
        stack: state.stack.concat(state.input.slice(0, n)),
        input: state.input.slice(n),
        offset: state.offset + n
    };
export const fail = (reason) => (state) => ({
    ...state,
    ok: false,
    reason
});
export const lexeme = (lexeme) => (state) => {
    const peeked = peek(state);
    return (peeked?.lexeme === lexeme
        ? succeed(1)
        : fail(`Expected "${lexeme}" but got ${stringify(peeked)}.`))(state);
};
export const type = (type) => (state) => {
    const peeked = peek(state);
    return (peeked?.type === type
        ? succeed(1)
        : fail(`Expected ${prefixIndefiniteArticle(type)} but got ${stringify(peeked)}.`))(state);
};
export const pair = (a, b) => (state) => {
    const result = a(state);
    return result.ok ? b(result) : result;
};
export const sequence = (parsers) => parsers.reduce(pair);
export const either = (a, b) => (state) => {
    const result = a(state);
    return result.ok ? result : b(state);
};
export const oneOf = (parsers) => parsers.reduce(either);
export const node = (type) => (parser) => (state) => {
    const result = parser(state);
    if (!result.ok)
        return result;
    const diff = state.stack.length - result.stack.length;
    return diff === 0
        ? {
            ...result,
            stack: result.stack.concat({
                type,
                children: []
            })
        }
        : {
            ...result,
            stack: result.stack.slice(0, diff).concat({
                type,
                children: result.stack.slice(diff)
            })
        };
};
export const zeroOrMore = (parser) => (state) => {
    let result = parser(state);
    if (!result.ok)
        return { ...state, ok: true };
    let previous = result;
    while (true) {
        [previous, result] = [result, parser(previous)];
        if (!result.ok)
            break;
    }
    return previous;
};
export const nOrMore = (n) => (parser) => sequence(range(n)
    .map(constant(parser))
    .concat(zeroOrMore(parser)));
export const oneOrMore = nOrMore(1);
export const delimited = (delimiter) => (parser) => pair(parser, zeroOrMore(pair(delimiter, parser)));
export const ignore = (parser) => (state) => {
    const result = parser(state);
    if (!result.ok)
        return result;
    return { ...result, stack: state.stack };
};
export const optional = (parser) => (state) => {
    const result = parser(state);
    return result.ok ? result : { ...state, ok: true };
};
export const benchmark = (parser) => (state) => {
    const before = performance.now();
    parser(state);
    return performance.now() - before;
};
export const debug = (parser, options) => (state) => {
    const info = {};
    if (options?.label)
        info.label = options.label;
    if (options?.elapsed) {
        const elapsed = benchmark(parser)(state);
        info.elapsed = elapsed;
    }
    const result = parser(state);
    if (options?.stack)
        info.stack = result.stack;
    if (options?.cache)
        info.cache = result.cache;
    if (Object.keys(info).length)
        print(info);
    return result;
};
export const nothing = (state) => {
    const peeked = peek(state);
    return !peeked
        ? { ...state, ok: true }
        : {
            ...state,
            ok: false,
            reason: `Expected nothing but got ${stringify(peeked)}.`
        };
};
export const anything = (state) => {
    const peeked = peek(state);
    return peeked
        ? { ...state, ok: true }
        : {
            ...state,
            ok: false,
            reason: `Expected anything but got nothing.`
        };
};
export const wrap = (start, end) => (parser) => sequence([start, parser, end]);
export const describe = (description) => (parser) => (state) => {
    const result = parser(state);
    return result.ok
        ? result
        : {
            ...result,
            reason: `Expected ${description} but got ${stringify(peek(state))}.`
        };
};
export const map = (f) => (parser) => (state) => {
    const result = parser(state);
    const diff = state.stack.length - result.stack.length;
    return diff === 0
        ? {
            ...result,
            stack: result.stack.concat(f([]))
        }
        : {
            ...result,
            stack: result.stack
                .slice(0, diff)
                .concat(f(result.stack.slice(diff)))
        };
};
export const nodeLeft = (type) => map(parsed => parsed
    .slice(0, -1)
    .reduce(stack => [
    { type, children: stack.slice(0, 2) },
    ...stack.slice(2)
], parsed));
export default parser("program", rule => ({
  "program": sequence([rule("statement"), zeroOrMore(sequence([ignore(lexeme(";")), rule("statement")])), optional(ignore(lexeme(";")))]),
  "statement": oneOf([rule("export"), rule("statement-body")]),
  "export": sequence([ignore(lexeme("export")), rule("statement-body")]),
  "statement-body": oneOf([rule("type-declaration"), oneOf([rule("declaration"), rule("expression")])]),
  "type-declaration": sequence([type("identifier"), optional(rule("type-parameters")), ignore(lexeme(":")), rule("type")]),
  "type-parameters": oneOrMore(type("identifier")),
  "type": rule("type-function"),
  "type-function": oneOf([sequence([rule("type-union"), ignore(lexeme("->")), rule("type-function")]), rule("type-union")]),
  "type-union": oneOf([sequence([rule("type-intersection"), ignore(lexeme("|")), rule("type-union")]), rule("type-intersection")]),
  "type-intersection": oneOf([sequence([rule("type-application"), ignore(lexeme("&")), rule("type-intersection")]), rule("type-application")]),
  "type-application": oneOf([nodeLeft("TODO")(sequence([rule("type-application"), rule("type-application")])), rule("type-access")]),
  "type-access": oneOf([sequence([rule("type-value"), ignore(lexeme(".")), rule("type-access")]), rule("type-value")]),
  "type-value": oneOf([sequence([ignore(lexeme("{")), optional(sequence([rule("type-field"), zeroOrMore(sequence([ignore(lexeme(",")), rule("type-field")]))])), ignore(lexeme("}"))]), oneOf([sequence([ignore(lexeme("[")), optional(sequence([rule("type"), zeroOrMore(sequence([ignore(lexeme(",")), rule("type")]))])), ignore(lexeme("]"))]), oneOf([rule("literal"), sequence([ignore(lexeme("(")), rule("type"), ignore(lexeme(")"))])])])]),
  "type-field": sequence([oneOrMore(rule("literal")), ignore(lexeme(":")), rule("type")]),
  "literal": oneOf([type("identifier"), oneOf([type("constant"), oneOf([type("string"), oneOf([type("number"), type("operator")])])])]),
  "declaration": oneOf([rule("function-declaration"), oneOf([rule("value-declaration"), rule("operator-declaration")])]),
  "function-declaration": sequence([type("identifier"), rule("expression"), ignore(lexeme("=")), rule("expression")]),
  "value-declaration": sequence([type("identifier"), ignore(lexeme("=")), rule("expression")]),
  "operator-declaration": sequence([rule("parameter"), type("operator"), rule("parameter"), ignore(lexeme("=")), rule("expression")]),
  "expression": sequence([oneOf([rule("match-expression"), oneOf([rule("if-expression"), oneOf([rule("lambda"), rule("operation")])])]), optional(rule("where-clause"))]),
  "match-expression": sequence([ignore(lexeme("match")), rule("expression"), oneOrMore(rule("match"))]),
  "match": sequence([rule("pattern"), optional(rule("match-guard")), ignore(lexeme("=")), rule("expression")]),
  "match-guard": sequence([ignore(lexeme("if")), rule("expression")]),
  "if-expression": sequence([ignore(lexeme("if")), rule("expression"), ignore(lexeme("then")), rule("expression"), ignore(lexeme("else")), rule("expression")]),
  "lambda": sequence([rule("parameter"), ignore(lexeme("->")), rule("expression")]),
  "operation": sequence([rule("application"), optional(sequence([type("operator"), rule("operation")]))]),
  "application": sequence([rule("access"), optional(rule("application"))])
}))