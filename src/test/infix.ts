import _eval from "../eval.js";
import parse from "../odd.js";
import test from "../test.js";
import { equal } from "../util.js";

test(
  "Operators are left-associative",
  equal(
    parse("a * b * c"),
    parse("(a * b) * c"),
    ([key]) => key !== "offset"
  )
);

test(
  "Operators have the same precedence",
  equal(
    parse("a + b * c"),
    parse("(a + b) * c"),
    ([key]) => key !== "offset"
  )
);

test("Using an undefined operator raises an error", () => {
  try {
    const code = `1 ** 1`;
    _eval(parse(code), {}, code);
    return false;
  } catch (err: any) {
    return (err.toString() as string).includes(
      `Operator "**" is not defined.`
    );
  }
});
