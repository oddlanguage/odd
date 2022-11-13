import _eval from "../eval.js";
import parse from "../odd.js";
import test from "../test.js";
import { equal } from "../util.js";

test("Lambdas do not pollute parent scope", () => {
  const code = `(a -> a) 1`;
  const [_, env] = _eval(parse(code), {}, code);
  return equal(env, {});
});

test(
  "Multiple parameters are desugared",
  equal(
    parse("a b c -> 1"),
    parse("a -> b -> c -> 1"),
    ([key]) => key !== "offset"
  )
);
