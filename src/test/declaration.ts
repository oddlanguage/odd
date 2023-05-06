import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  diff,
  difference,
  equal,
  serialise,
} from "../core/util.js";

test("Declared values are stored in scope", () => {
  const code = `a = 1`;
  const [, , env] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (env["a"] !== 1)
    return `Expected 1 but got ${env["a"]}`;
});

test("Declarations evaluate to rhs", () => {
  const code = `a = 1`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 1)
    return `Expected 1 but got ${result}`;
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
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 7)
    return `Expected 7 but got ${result}`;
});

test("Custom infix operators preserve environment", () => {
  const code = `
		a %^& b = 7;
		1 %^& 3;
	`;
  const [, , env] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (
    typeof difference(env, defaultEnv)["%^&"] !==
    "function"
  )
    return `Operator %^& was not defined or is not a function`;
  if (
    !equal(env, defaultEnv, ([key]) => key !== "%^&")
  )
    return `Environment was altered outside of %^&`;
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
  const code = `
		{a} %^& [b] = a + b;
		{a=1} %^& [2];
	`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 3)
    return `Expected 3 but got ${result}`;
});

test("Nth-order list pattern destructuring", () => {
  const code = `[a,[b,[c,de]]]=[1,[2,[3,[4, 5]]]];`;
  const [, , env] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (env["a"] !== 1)
    return `Expected 1 but got ${env["a"]}`;
  if (env["b"] !== 2)
    return `Expected 2 but got ${env["b"]}`;
  if (env["c"] !== 3)
    return `Expected 3 but got ${env["c"]}`;
  if (!equal(env["de"], [4, 5]))
    return `Expected [4, 5] but got ${serialise(
      env["de"]
    )}`;
});

test("Nth-order record pattern destructuring", () => {
  const code = `{a,b={c,d={e}}}={a=1,b={c=2,d={e=3}}};`;
  const [, , env] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (env["a"] !== 1)
    return `Expected 1 but got ${env["a"]}`;
  if (env["c"] !== 2)
    return `Expected 2 but got ${env["c"]}`;
  if (env["e"] !== 3)
    return `Expected 3 but got ${env["e"]}`;
});

test("List destructuring rest pattern", () => {
  const code = `[[a,...b]]=[[1, 2, 3]];[a,b]`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (!equal(result, [1, [2, 3]]))
    return `Expected [1, [2, 3]] but got ${serialise(
      result
    )}`;
});

test("Record destructuring rest pattern", () => {
  const code = `{a,b,c,d,...x}={a=1,b=2,c=3,d=4,y=5,z=6}`;
  const [, , env] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (env["a"] !== 1)
    return `Expected 1 but got ${env["a"]}`;
  if (env["b"] !== 2)
    return `Expected 2 but got ${env["b"]}`;
  if (env["c"] !== 3)
    return `Expected 3 but got ${env["c"]}`;
  if (env["d"] !== 4)
    return `Expected 3 but got ${env["d"]}`;
  if (!equal(env["x"], { y: 5, z: 6 }))
    return `Expected { y: 5, z: 6 } but got ${serialise(
      env["x"]
    )}`;
});

test("Self recursion", () => {
  const code = `
		fib n = case (n <= 1) of
			true = n,
			false = fib (n - 2) + fib (n - 1);
		fib 10`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 55)
    return `Expected 55 but got ${result}`;
});

test("Mutual recursion", () => {
  const code = `
		is-odd n = case (n == 1) of
			true = true,
			false = is-even (n - 1);
		is-even n = case (n == 0) of
			true = true,
			false = is-odd (n - 1);
		is-odd 3;
	`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== true)
    return `Expected true but got ${result}`;
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
