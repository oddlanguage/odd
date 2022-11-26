import _eval from "../eval.js";
import parse, { defaultEnv } from "../odd.js";
import test from "../test.js";
import { difference, equal } from "../util.js";

test("Empty record", () => {
  const code = `{}`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return equal(result, {});
});

test("Simple fields", () => {
  const code = `{a=1}`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return equal(result, { a: 1 });
});

test("Function fields", () => {
  const code = `{a b=1} ''a'' 0`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === 1;
});

test("Dangling commas are ignored", () => {
  const code = `{a=1,}`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return equal(result, { a: 1 });
});

test("Property shorthands", () => {
  const code = `a=1;{a}`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return equal(result, { a: 1 });
});

test("Destructuring", () => {
  const code = `x={a=1};{...x}`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return equal(result, { a: 1 });
});

test("Properties do not pollute scope", () => {
  const code = `{a=1}`;
  const [, env] = _eval(parse(code), defaultEnv, code);
  return equal(difference(defaultEnv, env), {});
});

test("Fields can reference outer scope", () => {
  const code = `b=1;{a=b} ''a''`;
  const [value] = _eval(parse(code), defaultEnv, code);
  return value === 1;
});
