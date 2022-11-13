import _eval from "../eval.js";
import parse from "../odd.js";
import test from "../test.js";
import { equal } from "../util.js";

test("Empty lists", () => {
  const code = `[]`;
  const [result] = _eval(parse(code), {}, code);
  return equal(result, []);
});

test("Simple elements", () => {
  const code = `[1, ''a'', true]`;
  const [result] = _eval(
    parse(code),
    { true: true },
    code
  );
  return equal(result, [1, "a", true]);
});

test("Complex elements", () => {
  const code = `[a -> b, [], {x=7}, (a -> a) 1]`;
  try {
    _eval(parse(code), {}, code);
    return true;
  } catch (_) {
    return false;
  }
});

test("Dangling commas are ignored", () => {
  const code = `[1,]`;
  const [result] = _eval(parse(code), {}, code);
  return equal(result, [1]);
});

test("Destructuring", () => {
  const code = `x=[1];[...x]`;
  const [result] = _eval(parse(code), {}, code);
  return equal(result, [1]);
});
