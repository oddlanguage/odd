import _eval from "../eval.js";
import parse, { defaultEnv } from "../odd.js";
import test from "../test.js";
import { diff, equal } from "../util.js";

test("Lambdas do not pollute parent scope", () => {
  const code = `(a -> a) 1`;
  const [_, env] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return equal(diff(env, defaultEnv), {});
});

test(
  "Multiple parameters are desugared",
  equal(
    parse("a b c -> 1"),
    parse("a -> b -> c -> 1"),
    ([key]) => key !== "offset"
  )
);
