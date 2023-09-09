import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  diff,
  difference,
  equal,
  serialise,
} from "../core/util.js";

test("Lambdas do not pollute parent scope", () => {
  const code = `(a -> a) 1`;
  const [, , env] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (!equal(difference(env, defaultEnv), {}))
    return serialise(diff(env, defaultEnv));
});

test("Multiple parameters are desugared", () => {
  const a = parse("a b c -> 1");
  const b = parse("a -> b -> c -> 1");

  if (
    !equal(
      a,
      b,
      ([key]) => !["offset", "size"].includes(key)
    )
  )
    return serialise(diff(a, b));
});

test("First-order record pattern argument destructuring", () => {
  const code = `({a}->a) {a=1}`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 1)
    return `Expected 1 but got ${result}`;
});

test("First-order list pattern argument destructuring", () => {
  const code = `([a]->a) [1]`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 1)
    return `Expected 1 but got ${result}`;
});

test("Lambdas are folded properly", () => {
  const expected = {
    type: "program",
    children: [
      {
        type: "lambda",
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
                    offset: 5,
                    size: 1,
                  },
                ],
                offset: 5,
                size: 1,
              },
              {
                type: "number",
                text: "0",
                offset: 10,
                size: 1,
              },
            ],
            offset: 5,
            size: 6,
          },
        ],
        offset: 0,
        size: 11,
      },
    ],
    offset: 0,
    size: 11,
  };
  const got = parse("a -> b -> 0");

  if (!equal(got, expected))
    return serialise(diff(got, expected));
});
