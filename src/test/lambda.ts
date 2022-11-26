import _eval from "../eval.js";
import parse, { defaultEnv } from "../odd.js";
import test from "../test.js";
import { difference, equal } from "../util.js";

test("Lambdas do not pollute parent scope", () => {
  const code = `(a -> a) 1`;
  const [_, env] = _eval(
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
