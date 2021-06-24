import { isToken, print } from "./odd.js";
const compare = (a, b) => Object.is(a, b) || (JSON.stringify(a) === JSON.stringify(b));
export const stringify = (tree) => `(${(isToken(tree))
    ? `"${tree.lexeme}"`
    : `${tree.type} ${tree.children.map(stringify).join(" ")}`})`;
export const expect = (description) => (expected) => (got) => {
    if (!compare(expected, got))
        throw `${description} FAIL:\nEXPECTED:\n${stringify(expected)}\nGOT:\n${stringify(got)}`;
    print(`${description} PASS`);
    return got;
};
