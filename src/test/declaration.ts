import _eval from "../eval.js";
import parse from "../odd.js";
import test from "../test.js";
import { equal } from "../util.js";

const code = `a = 1`;
const [result, env] = _eval(parse(code), {}, code);

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
