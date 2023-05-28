import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  booleanType,
  defaultTypeEnv,
  infer,
  numberType,
  stringify,
} from "../core/type.js";
import {
  dedent,
  diff,
  equal,
  serialise,
} from "../core/util.js";

test("Declared values are stored in scope", () => {
  const code = `a = 1`;
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);
  const [, tenv] = infer(parsed, defaultTypeEnv, code);

  if (env["a"] !== 1)
    return `Expected 1 but got ${env["a"]}`;
  if (tenv["a"] !== numberType)
    return `Expected Number but got ${stringify(
      env["a"]
    )}`;
});

test("Declarations evaluate to rhs", () => {
  const code = `a = 1`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);
  const [type] = infer(parsed, defaultTypeEnv, code);

  if (result !== 1)
    return `Expected 1 but got ${result}`;
  if (type !== numberType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("Function declarations are desugared into lambdas", () => {
  const a = parse("a b c = 1");
  const b = parse("a = b -> c -> 1");

  if (
    !equal(
      a,
      b,
      ([key]) => !["offset", "size"].includes(key)
    )
  )
    return serialise(diff(a, b));
});

test("Custom infix operators", () => {
  const code = `a %^& b = 7;1 %^& 3`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);
  const [type] = infer(parsed, defaultTypeEnv, code);

  if (result !== 7)
    return `Expected 7 but got ${result}`;
  if (type !== numberType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("Custom infix operators preserve environment", () => {
  const code = dedent(`
    a %^& b = 7;
    1 %^& 3;
  `);
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);
  const [type] = infer(parsed, defaultTypeEnv, code);

  if (typeof env["%^&"] !== "function")
    return `Operator %^& was not defined or is not a function`;
  if (
    !equal(env, defaultEnv, ([key]) => key !== "%^&")
  )
    return `Environment was altered outside of %^&`;
  if (type !== numberType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("Infix declarations are desugared into lambdas", () => {
  const a = parse("a %^& b = 3");
  const b = parse("(%^&) = b -> a -> 3");

  if (
    !equal(
      a,
      b,
      ([key]) => !["offset", "size"].includes(key)
    )
  )
    return serialise(diff(a, b));
});

test("Infix declarations allow arbitrary patterns", () => {
  const code = dedent(`
    {a} %^& [b] = a + b;
    {a=1} %^& [2];
  `);
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);
  const [type] = infer(parsed, defaultTypeEnv, code);

  if (result !== 3)
    return `Expected 3 but got ${result}`;
  if (type !== numberType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("Nth-order list pattern destructuring", () => {
  const code = `[a,[b,[c,de]]]=[1,[2,[3,[4, 5]]]];`;
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);
  const [, tenv] = infer(parsed, defaultTypeEnv, code);

  if (env["a"] !== 1)
    return `Expected 1 but got ${env["a"]}`;
  if (tenv["a"] !== numberType)
    return `Expected Number but got ${stringify(
      tenv["a"]!
    )}`;
  if (env["b"] !== 2)
    return `Expected 2 but got ${env["b"]}`;
  if (tenv["b"] !== numberType)
    return `Expected Number but got ${stringify(
      tenv["b"]!
    )}`;
  if (env["c"] !== 3)
    return `Expected 3 but got ${env["c"]}`;
  if (tenv["c"] !== numberType)
    return `Expected Number but got ${stringify(
      tenv["c"]!
    )}`;
  if (!equal(env["de"], [4, 5]))
    return `Expected [4, 5] but got ${serialise(
      env["de"]
    )}`;
  if (stringify(tenv["de"]!) !== "List Number")
    return `Expected List Number but got ${stringify(
      tenv["de"]!
    )}`;
});

test("Nth-order record pattern destructuring", () => {
  const code = `{a,b={c,d={e}}}={a=1,b={c=2,d={e=3}}};`;
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);
  const [, tenv] = infer(parsed, defaultTypeEnv, code);

  if (env["a"] !== 1)
    return `Expected 1 but got ${env["a"]}`;
  if (tenv["a"] !== numberType)
    return `Expected Number but got ${stringify(
      tenv["a"]!
    )}`;
  if (env["c"] !== 2)
    return `Expected 2 but got ${env["c"]}`;
  if (tenv["c"] !== numberType)
    return `Expected Number but got ${stringify(
      tenv["c"]!
    )}`;
  if (env["e"] !== 3)
    return `Expected 3 but got ${env["e"]}`;
  if (tenv["e"] !== numberType)
    return `Expected Number but got ${stringify(
      tenv["e"]!
    )}`;
});

test("List destructuring rest pattern", () => {
  const code = `[a,...b]=[1, 2, 3];`;
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);
  const [, tenv] = infer(parsed, defaultTypeEnv, code);

  if (env["a"] !== 1)
    return `Expected 1 but got ${serialise(env["a"])}`;
  if (tenv["a"] !== numberType)
    return `Expected Number but got ${stringify(
      tenv["a"]!
    )}`;
  if (!equal(env["b"], [2, 3]))
    return `Expected [2, 3] but got ${serialise(
      env["b"]
    )}`;
  if (stringify(tenv["b"]!) !== "List Number")
    return `Expected List Number but got ${stringify(
      tenv["b"]!
    )}`;
});

test("Record destructuring rest pattern", () => {
  const code = `{a,b,c,d,...x}={a=1,b=2,c=3,d=4,y=5,z=6}`;
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);
  const [, tenv] = infer(parsed, defaultTypeEnv, code);

  if (env["a"] !== 1)
    return `Expected 1 but got ${env["a"]}`;
  if (tenv["a"] !== numberType)
    return `Expected Number but got ${stringify(
      tenv["a"]!
    )}`;
  if (env["b"] !== 2)
    return `Expected 2 but got ${env["b"]}`;
  if (tenv["b"] !== numberType)
    return `Expected Number but got ${stringify(
      tenv["b"]!
    )}`;
  if (env["c"] !== 3)
    return `Expected 3 but got ${env["c"]}`;
  if (tenv["c"] !== numberType)
    return `Expected Number but got ${stringify(
      tenv["c"]!
    )}`;
  if (env["d"] !== 4)
    return `Expected 4 but got ${env["d"]}`;
  if (tenv["d"] !== numberType)
    return `Expected Number but got ${stringify(
      tenv["d"]!
    )}`;
  if (!equal(env["x"], { y: 5, z: 6 }))
    return `Expected { y: 5, z: 6 } but got ${serialise(
      env["x"]
    )}`;
  if (
    stringify(tenv["x"]!) !==
    "{ y : Number, z : Number }"
  )
    return `Expected { y : Number, z : Number } but got ${stringify(
      tenv["a"]
    )}`;
});

test("Self recursion", () => {
  const code = dedent(`
    fib n = case (n <= 1) of
      true = n,
      false = fib (n - 2) + fib (n - 1);
    fib 10`);
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);
  const [type] = infer(parsed, defaultTypeEnv, code);

  if (result !== 55)
    return `Expected 55 but got ${result}`;
  if (type !== numberType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("Mutual recursion", () => {
  const code = dedent(`
    is-odd n = case (n == 1) of
      true = true,
      false = is-even (n - 1);
    is-even n = case (n == 0) of
      true = true,
      false = is-odd (n - 1);
    is-odd 3;
  `);
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);
  const [type] = infer(parsed, defaultTypeEnv, code);

  if (result !== true)
    return `Expected true but got ${result}`;
  if (type !== booleanType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("Curried declarations are folded properly", () => {
  const expected = {
    type: "program",
    children: [
      {
        type: "declaration",
        children: [
          {
            type: "literal-pattern",
            children: [
              {
                type: "name",
                text: "a",
                offset: 0,
                size: 1,
              },
            ],
            offset: 0,
            size: 1,
          },
          {
            type: "lambda",
            children: [
              {
                type: "literal-pattern",
                children: [
                  {
                    type: "name",
                    text: "b",
                    offset: 2,
                    size: 1,
                  },
                ],
                offset: 2,
                size: 1,
              },
              {
                type: "number",
                text: "0",
                offset: 6,
                size: 1,
              },
            ],
            offset: 2,
            size: 5,
          },
        ],
        offset: 0,
        size: 7,
      },
    ],
    offset: 0,
    size: 7,
  };
  const a = parse("a b = 0");

  if (!equal(expected, a))
    return serialise(diff(expected, a));
});
