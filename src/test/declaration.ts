import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  dedent,
  diff,
  equal,
  showOddValue,
} from "../core/util.js";

test("Declared values are stored in scope", () => {
  const code = `a = 1`;
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);

  if (env["a"] !== 1) {
    return `Expected\n  1\nbut got\n  ${showOddValue(
      env["a"]
    )}`;
  }
});

test("Declarations evaluate to rhs", () => {
  const code = `a = 1`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 1) {
    return `Expected\n  1\nbut got\n  ${showOddValue(
      result
    )}`;
  }
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
  ) {
    return showOddValue(diff(a, b));
  }
});

test("Custom infix operators", () => {
  const code = `a %^& b = 7;1 %^& 3`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 7) {
    return `Expected\n  7\nbut got\n  ${showOddValue(
      result
    )}`;
  }
});

test("Custom infix operators preserve environment", () => {
  const code = dedent(`
    a %^& b = 7;
    1 %^& 3;
  `);
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);

  if (typeof env["%^&"] !== "function") {
    return `Operator %^& was not defined or is not a function`;
  }
  if (
    !equal(env, defaultEnv, ([key]) => key !== "%^&")
  ) {
    return `Environment was altered outside of %^&`;
  }
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
  ) {
    return showOddValue(diff(a, b));
  }
});

test("Infix declarations allow arbitrary patterns", () => {
  const code = dedent(`
    {a} %^& [b] = a + b;
    {a=1} %^& [2];
  `);
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 3) {
    return `Expected\n  3\nbut got\n  ${result}`;
  }
});

test("Nth-order list pattern destructuring", () => {
  const code = `[a,[b,[c,de]]]=[1,[2,[3,[4, 5]]]];`;
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);

  if (env["a"] !== 1) {
    return `Expected\n  1\nbut got\n  ${showOddValue(
      env["a"]
    )}`;
  }
  if (env["b"] !== 2) {
    return `Expected\n  2\nbut got\n  ${showOddValue(
      env["b"]
    )}`;
  }
  if (env["c"] !== 3) {
    return `Expected\n  3\nbut got\n  ${showOddValue(
      env["c"]
    )}`;
  }
  if (!equal(env["de"], [4, 5])) {
    return `Expected\n  [4, 5]\nbut got\n  ${showOddValue(
      env["de"]
    )}`;
  }
});

test("Nth-order record pattern destructuring", () => {
  const code = `{a,b={c,d={e}}}={a=1,b={c=2,d={e=3}}};`;
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);

  if (env["a"] !== 1) {
    return `Expected\n  1\nbut got\n  ${showOddValue(
      env["a"]
    )}`;
  }
  if (env["c"] !== 2) {
    return `Expected\n  2\nbut got\n  ${showOddValue(
      env["c"]
    )}`;
  }
  if (env["e"] !== 3) {
    return `Expected\n  3\nbut got\n  ${showOddValue(
      env["e"]
    )}`;
  }
});

test("List destructuring rest pattern", () => {
  const code = `[a,...b]=[1, 2, 3];`;
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);

  if (env["a"] !== 1) {
    return `Expected\n  1\nbut got\n  ${showOddValue(
      env["a"]
    )}`;
  }
  if (!equal(env["b"], [2, 3])) {
    return `Expected\n  [2, 3]\nbut got\n  ${showOddValue(
      env["b"]
    )}`;
  }
});

test("Record destructuring rest pattern", () => {
  const code = `{a,b,c,d,...x}={a=1,b=2,c=3,d=4,y=5,z=6}`;
  const parsed = parse(code);
  const [, , env] = _eval(parsed, defaultEnv, code);

  if (env["a"] !== 1) {
    return `Expected\n  1\nbut got\n  ${showOddValue(
      env["a"]
    )}`;
  }
  if (env["b"] !== 2) {
    return `Expected\n  2\nbut got\n  ${showOddValue(
      env["b"]
    )}`;
  }
  if (env["c"] !== 3) {
    return `Expected\n  3\nbut got\n  ${showOddValue(
      env["c"]
    )}`;
  }
  if (env["d"] !== 4) {
    return `Expected\n  4\nbut got\n  ${showOddValue(
      env["d"]
    )}`;
  }
  if (!equal(env["x"], { y: 5, z: 6 })) {
    return `Expected { y: 5, z: 6 } but got ${showOddValue(
      env["x"]
    )}`;
  }
});

test("Self recursion", () => {
  const code = dedent(`
    fib n = case (n <= 1) of
      true = n,
      false = fib (n - 2) + fib (n - 1);
    fib 10`);
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 55) {
    return `Expected\n  55\nbut got\n${result}`;
  }
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
  const [result] = _eval(
    parsed,
    {
      true: true,
      false: false,
      "==": (b: any) => (a: any) => a === b,
      "-": (b: any) => (a: any) => a - b,
    },
    code
  );

  if (result !== true) {
    return `Expected\n  true\nbut got\n${result}`;
  }
});

test("Curried declarations are folded properly", () => {
  const expected = {
    type: "program",
    children: [
      {
        type: "statement",
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
      },
    ],
    offset: 0,
    size: 7,
  };
  const got = parse("a b = 0");

  if (!equal(expected, got)) {
    return showOddValue(diff(expected, got));
  }
});
