import { performance } from "node:perf_hooks";
import { print } from "./odd.js";
const parser = (grammar) => (input) => {
    const result = grammar.program({
        input,
        grammar,
        stack: []
    });
    if (!result.ok)
        throw result.reason;
    if (result.input.length) {
        const peeked = peek(result);
        print(result.stack);
        throw `Unexpected ${peeked?.type} "${peeked?.lexeme}".`;
    }
    return result.stack;
};
export default parser;
export const peek = (state) => state.input[0];
export const rule = (name) => (state) => {
    if (!state.grammar[name])
        throw `Unkown grammar rule "${name}".`;
    return state.grammar[name](state);
};
export const succeed = (stack) => (input) => (state) => ({ ...state, ok: true, stack, input });
export const eat = (n) => (state) => succeed(state.stack.concat(state.input.slice(0, n)))(state.input.slice(n))(state);
export const fail = (reason) => (state) => ({ ...state, ok: false, reason });
export const lexeme = (lexeme) => (state) => {
    const peeked = peek(state);
    return (peeked?.lexeme === lexeme)
        ? eat(1)(state)
        : fail(`Expected "${lexeme}" but got "${peeked?.lexeme ?? "EOF"}".`)(state);
};
const prefixIndefiniteArticle = (thing) => thing && `${/^[aeuioy]/.test(thing) ? "an" : "a"} ${thing}`;
export const type = (type) => (state) => {
    const peeked = peek(state);
    return (peeked?.type === type)
        ? eat(1)(state)
        : fail(`Expected ${prefixIndefiniteArticle(type)} but got ${prefixIndefiniteArticle(peeked?.type) ?? "EOF"}.`)(state);
};
export const pair = (a, b) => (state) => {
    const result = a(state);
    return (result.ok)
        ? b(result)
        : result;
};
export const sequence = (parsers) => parsers.reduce(pair);
export const either = (a, b) => (state) => {
    const result = a(state);
    return (result.ok)
        ? result
        : b(state);
};
export const oneOf = (parsers) => parsers.reduce(either);
export const node = (type) => (parser) => (state) => {
    const result = parser(state);
    if (!result.ok)
        return result;
    const diff = state.stack.length - result.stack.length;
    return { ...result, stack: result.stack.slice(0, diff).concat({ type, children: result.stack.slice(diff) }) };
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
export const oneOrMore = (parser) => pair(parser, zeroOrMore(parser));
export const delimited = (delimiter) => (parser) => pair(parser, zeroOrMore(pair(delimiter, parser)));
export const ignore = (parser) => (state) => {
    const result = parser(state);
    if (!result.ok)
        return result;
    return { ...result, stack: state.stack };
};
export const debug = (parser, options) => (state) => {
    if (options?.label)
        print(`Trying "${options?.label}":`);
    const before = performance.now();
    const result = parser(state);
    const elapsed = performance.now() - before;
    print({ before: state.stack, after: result.stack, elapsed });
    return result;
};
export const optional = (parser) => (state) => {
    const result = parser(state);
    return (result.ok)
        ? result
        : { ...state, ok: true };
};
