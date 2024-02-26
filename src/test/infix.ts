import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  diff,
  equal,
  showOddValue,
} from "../core/util.js";

test("Infix operators", () => {
  const code = `1 + 1`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 2)
    return `Expected 2 but got ${result}`;
});

test("Operators are left-associative", () => {
  const a = parse("a * b * c");
  const b = parse("(a * b) * c");

  if (
    !equal(
      a,
      b,
      ([key]) => !["offset", "size"].includes(key)
    )
  )
    return showOddValue(diff(a, b));
});

test("Operators have the same precedence", () => {
  const a = parse("a + b * c");
  const b = parse("(a + b) * c");

  if (
    !equal(
      a,
      b,
      ([key]) => !["offset", "size"].includes(key)
    )
  )
    return showOddValue(diff(a, b));
});

// test("Using an undefined operator raises an error", () => {
//   try {
//     const code = `1 ** 1`;
//     const [type] = infer(
//       parse(code),
//       defaultTypeEnv,
//       code
//     );

//     return `Expected an error but got resolved to type ${stringify(
//       type
//     )}`;
//   } catch (_) {}
// });

test("Operators can be literally applied", () => {
  const code = `(+) 1 1`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 2) `Expected 2 but got ${result}`;
});

test("Literal application follows natural order", () => {
  const code1 = `(/) 9 2`;
  const parsed1 = parse(code1);
  const [a] = _eval(parsed1, defaultEnv, code1);
  const code2 = `2 / 9`;
  const parsed2 = parse(code2);
  const [b] = _eval(parsed2, defaultEnv, code2);

  if (a !== b) `Expected ${a} to equal ${b}`;
});

test("Boolean operators don't evaluate both sides", () => {
  try {
    [
      `true | panic ''"|" didn't short-circuit.''`,
      `false & panic ''"&" didn't short-circuit.''`,
    ].forEach(code =>
      _eval(parse(code), defaultEnv, code)
    );
  } catch (err: any) {
    return err.toString();
  }
});
