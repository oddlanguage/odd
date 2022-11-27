import _eval from "../eval.js";
import parse, { defaultEnv } from "../odd.js";
import test from "../test.js";
import { difference, equal } from "../util.js";

test("Declared values are stored in scope", () => {
  const code = `a = 1`;
  const [, env] = _eval(parse(code), defaultEnv, code);
  return env["a"] === 1;
});

test("Declarations evaluate to rhs", () => {
  const code = `a = 1`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === 1;
});

test("Function declarations are desugared into lambdas", () =>
  equal(
    parse("a b c = 1"),
    parse("a = b -> c -> 1"),
    ([key]) => !["offset", "size"].includes(key)
  ));

test("Only names are assignable", () => {
  try {
    const code = `a = 1`;
    const [, env] = _eval(
      parse(code),
      defaultEnv,
      code
    );
    [`''a'' = 1;`, `1 = 1;`, `true = 1;`].forEach(
      code => _eval(parse(code), env, code)
    );
    return false;
  } catch (_) {
    return true;
  }
});

test("Redefining a value raises an error", () => {
  const code = `a=1;a=2`;
  try {
    _eval(parse(code), defaultEnv, code);
    return false;
  } catch (_) {
    return true;
  }
});

test("First-order record pattern destructuring", () => {
  const code = `{a}={a=1};a`;
  const [value] = _eval(parse(code), defaultEnv, code);
  return value === 1;
});

test("First-order list pattern destructuring", () => {
  const code = `[a]=[1];a`;
  const [value] = _eval(parse(code), defaultEnv, code);
  return value === 1;
});

test("Custom infix operators", () => {
  const code = `a %^& b = 7;1 %^& 3`;
  const [value] = _eval(parse(code), defaultEnv, code);
  return value === 7;
});

test("Custom infix operators preserve scope", () => {
  const code = `a %^& b = 7;1 %^& 3`;
  const [, env] = _eval(parse(code), defaultEnv, code);
  return (
    typeof difference(env, defaultEnv)["%^&"] ===
      "function" &&
    equal(env, defaultEnv, ([key]) => key !== "%^&")
  );
});

test("Infix declarations are desugared into lambdas", () =>
  equal(
    parse("a %^& b = 3"),
    parse("(%^&) = b -> a -> 3"),
    ([key]) => !["offset", "size"].includes(key)
  ));

test("Second-order list pattern destructuring", () => {
  const code = `[[a]]=[[1]]`;
  const [value] = _eval(parse(code), defaultEnv, code);
  return value === 1;
});

test("Second-order record pattern destructuring", () => {
  const code = `{a={b}}={a={b=1}}`;
  const [value] = _eval(parse(code), defaultEnv, code);
  return value === 1;
});
