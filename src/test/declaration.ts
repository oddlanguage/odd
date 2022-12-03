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

test("Infix declarations allow arbitrary patterns", () => {
  const code = "{a} %^& [b] = a+b;{a=1}%^&[2]";
  const [value] = _eval(parse(code), defaultEnv, code);
  return value === 3;
});

test("Nth-order list pattern destructuring", () => {
  const code = `[a,[b,[c, de]]]=[1,[2,[3,[4, 5]]]];`;
  const [, env] = _eval(parse(code), defaultEnv, code);
  return (
    env["a"] === 1 &&
    env["b"] === 2 &&
    env["c"] === 3 &&
    equal(env["de"], [4, 5])
  );
});

test("Nth-order record pattern destructuring", () => {
  const code = `{a,b={c,d={ef}}}={a=1,b={c=2,d={ef=3}}};`;
  const [, env] = _eval(parse(code), defaultEnv, code);
  return (
    env["a"] === 1 && env["c"] === 2 && env["ef"] === 3
  );
});

test("List destructuring rest pattern", () => {
  const code = `[[a,...b]]=[[1, 2, 3]];[a,b]`;
  const [value] = _eval(parse(code), defaultEnv, code);
  return equal(value, [1, [2, 3]]);
});

test("Record destructuring rest pattern", () => {
  const code = `{a,b,c,d,...x}={a=1,b=2,c=3,d=4,y=5,z=6}`;
  const [, env] = _eval(parse(code), defaultEnv, code);
  return (
    env["a"] === 1 &&
    env["b"] === 2 &&
    env["c"] === 3 &&
    env["d"] === 4 &&
    equal(env["x"], { y: 5, z: 6 })
  );
});
