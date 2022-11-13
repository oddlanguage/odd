import _eval from "../eval.js";
import parse, { defaultEnv } from "../odd.js";
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
    _eval(parse(code), defaultEnv, code);
    return false;
  } catch (err: any) {
    return (err.toString() as string).includes(
      `Operator "**" is not defined.`
    );
  }
});

test("Operators can be literally applied", () => {
  const code = `(+) 1 1`;
  const [result] = _eval(
    parse(code),
    { "+": (b: any) => (a: any) => a + b },
    code
  );
  return result === 2;
});

test("Literal application follows natural order", () => {
  const code1 = `(/) 9 2`;
  const [a] = _eval(
    parse(code1),
    { "/": (b: any) => (a: any) => a / b },
    code1
  );
  const code2 = `2 / 9`;
  const [b] = _eval(
    parse(code2),
    { "/": (b: any) => (a: any) => a / b },
    code2
  );
  return a === b;
});
