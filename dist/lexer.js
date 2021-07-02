export const stringifyToken = (token) => (token)
    ? `${token.type} "${token.lexeme}" at ${Object.entries(token.location).map(entry => entry.join(" ")).join(", ")}`
    : "EOF";
const didMatch = (match) => !!match;
const apply = (...args) => (f) => f(...args);
const compare = (a, b) => (a > b) ? 1 : (a === b) ? 0 : -1;
const compareBy = (f) => (a, b) => compare(f(a), f(b));
const largest = (comparator) => (a, b) => (comparator(a, b) >= 0) ? a : b;
const isComplex = (rule) => rule.start !== undefined;
const lexer = (rules) => {
    const patterns = rules.map((rule) => (input) => {
        if (isComplex(rule)) {
            throw "No implemented.";
        }
        const { type, pattern, ignore } = rule;
        if (typeof pattern === "string")
            return input.startsWith(pattern) && { type, lexeme: pattern, ignore };
        const regex = new RegExp(`^(?:${pattern.source})`, pattern.flags.replace(/[gmys]/, ""));
        const lexeme = input.match(regex)?.[0];
        if (lexeme)
            return { type, lexeme, ignore };
    });
    let line = 1;
    let char = 1;
    const lex = (input) => {
        if (input.length === 0)
            return [];
        const longest = patterns
            .map(apply(input))
            .filter(didMatch)
            .reduce(largest(compareBy(item => item.lexeme.length)), { type: "", lexeme: "" });
        if (longest.lexeme.length === 0)
            throw `Unknown character "${input.charAt(0)}".`;
        const { ignore, type, lexeme } = longest;
        const location = { line, char };
        for (let i = 0; i < lexeme.length; i++) {
            const codepoint = lexeme.charAt(i);
            if (/^[^\r\n]/.test(codepoint))
                char++;
            if (/^\r*\n/.test(codepoint)) {
                char = 1;
                line++;
            }
        }
        return (ignore ? [] : [{ type, lexeme, location }]).concat(lex(input.slice(lexeme.length)));
    };
    return lex;
};
export default lexer;
