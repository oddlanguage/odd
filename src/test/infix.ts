import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import { equal } from "../core/util.js";

test("Infix operators", () => {
  const code = `1 + 1`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === 2;
});

test("Operators are left-associative", () =>
  equal(
    parse("a * b * c"),
    parse("(a * b) * c"),
    ([key]) => !["offset", "size"].includes(key)
  ));

test("Operators have the same precedence", () =>
  equal(
    parse("a + b * c"),
    parse("(a + b) * c"),
    ([key]) => !["offset", "size"].includes(key)
  ));

test("Using an undefined operator raises an error", () => {
  try {
    const code = `1 ** 1`;
    _eval(parse(code), defaultEnv, code);
    return false;
  } catch (err: any) {
    return true;
  }
});

test("Operators can be literally applied", () => {
  const code = `(+) 1 1`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === 2;
});

test("Literal application follows natural order", () => {
  const code1 = `(/) 9 2`;
  const [a] = _eval(parse(code1), defaultEnv, code1);
  const code2 = `2 / 9`;
  const [b] = _eval(parse(code2), defaultEnv, code2);
  return a === b;
});

test("Boolean operators don't evaluate both sides", () => {
  [
    `true | panic ''"|" didn't short-circuit.''`,
    `false & panic ''"&" didn't short-circuit.''`
  ].forEach(code =>
    _eval(parse(code), defaultEnv, code)
  );

  return true;
});
