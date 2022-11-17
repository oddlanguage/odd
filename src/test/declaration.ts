import _eval from "../eval.js";
import parse, { defaultEnv } from "../odd.js";
import test from "../test.js";
import { equal } from "../util.js";

const code = `a = 1`;
const [result, env] = _eval(
  parse(code),
  defaultEnv,
  code
);

test(
  "Declared values are stored in scope",
  env["a"] === 1
);

test("Declarations evaluate to rhs", result === 1);

test(
  "Function declarations are desugared into lambdas",
  equal(
    parse("a b c = 1"),
    parse("a = b -> c -> 1"),
    ([key]) => key !== "offset"
  )
);

test("Only names are assignable", () => {
  try {
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
