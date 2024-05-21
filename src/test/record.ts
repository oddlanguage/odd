import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  diff,
  difference,
  equal,
  showOddValue,
} from "../core/util.js";

test("Empty record", () => {
  const code = `{}`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  const expected = {};
  if (!equal(result, expected))
    return showOddValue(diff(result, expected));
});

test("Simple fields", () => {
  const code = `{a=1}`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  const expected = { a: 1 };
  if (!equal(result, expected))
    return showOddValue(diff(result, expected));
});

test("Function fields", () => {
  const code = `{a b=1} ''a'' 0`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 1) `Expected 1 but got ${result}`;
});

test("Dangling commas are ignored", () => {
  const code = `{a=1,}`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  const expected = { a: 1 };
  if (!equal(result, expected))
    return showOddValue(diff(result, expected));
});

test("Property shorthands", () => {
  const code = `a=1;{a}`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  const expected = { a: 1 };
  if (!equal(result, expected))
    return showOddValue(diff(result, expected));
});

test("Destructuring", () => {
  const code = `x={a=1};{...x}`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  const expected = { a: 1 };
  if (!equal(result, expected))
    return showOddValue(diff(result, expected));
});

test("Properties do not pollute scope", () => {
  const code = `{a=1}`;
  const [, , env] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (!equal(difference(defaultEnv, env), {}))
    return showOddValue(diff(defaultEnv, env));
});

test("Fields can reference outer scope", () => {
  const code = `b=1;{a=b} ''a''`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 1)
    `Expected\n  1\nbut got\n  ${result}`;
});
