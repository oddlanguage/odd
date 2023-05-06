import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  diff,
  equal,
  serialise,
} from "../core/util.js";

test("Empty lists", () => {
  const code = `[]`;
  const expected = [] as const;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (!equal(result, expected))
    return serialise(diff(expected, result));
});

test("Simple elements", () => {
  const code = `[1, ''a'', true]`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  const expected = [1, "a", true];

  if (!equal(result, expected))
    return serialise(diff(expected, result));
});

test("Complex elements", () => {
  try {
    const code = `[a -> b, [], {x=7}, (a -> a) 1]`;
    _eval(parse(code), defaultEnv, code);
  } catch (err: any) {
    return err.toString();
  }
});

test("Dangling commas are ignored", () => {
  const code = `[1,]`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  const expected = [1];

  if (!equal(result, expected))
    return serialise(diff(expected, result));
});

test("Destructuring", () => {
  const code = `x=[1];[...x]`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  const expected = [1];

  if (!equal(result, expected))
    return serialise(diff(expected, result));
});
