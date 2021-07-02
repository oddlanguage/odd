import { isDeepStrictEqual } from "node:util";
import { print } from "./odd.js";
export const compare = (a, b) => isDeepStrictEqual(a, b);
export const expect = (description) => (expected) => (got) => {
    if (!compare(expected, got))
        throw `${description} FAIL:\nEXPECTED:\n${JSON.stringify(expected, null, 2)}\nGOT:\n${JSON.stringify(got, null, 2)}`;
    print(`${description} PASS`);
    return got;
};
