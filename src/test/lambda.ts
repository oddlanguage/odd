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
  return equal(difference(env, defaultEnv), {});
});

test("Multiple parameters are desugared", () =>
  equal(
    parse("a b c -> 1"),
    parse("a -> b -> c -> 1"),
    ([key]) => !["offset", "size"].includes(key)
  ));

test("First-order record pattern argument destructuring", () => {
  const code = `({a}->a) {a=1}`;
  const [value] = _eval(parse(code), defaultEnv, code);
  return value === 1;
});

test("First-order list pattern argument destructuring", () => {
  const code = `([a]->a) [1]`;
  const [value] = _eval(parse(code), defaultEnv, code);
  return value === 1;
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
  const ok = equal(got, expected);

  if (!ok) throw serialise(diff(got, expected));

  return ok;
});
