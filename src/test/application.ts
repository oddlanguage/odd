import _eval from "../eval.js";
import parse from "../odd.js";
import test from "../test.js";

test("Function application", () => {
  const code = `f x = x + 1;f 0`;
  const [result] = _eval(
    parse(code),
    { "+": (a: any) => (b: any) => a + b },
    code
  );
  return result === 1;
});

test("Literal application", () => {
  const code = `(x -> x + 1) 0`;
  const [result] = _eval(
    parse(code),
    { "+": (a: any) => (b: any) => a + b },
    code
  );
  return result === 1;
});

test("Record access", () => {
  const code = `{a=1} ''a''`;
  const [result] = _eval(parse(code), {}, code);
  return result === 1;
});

test("List access", () => {
  const code = `[1] 0`;
  const [result] = _eval(parse(code), {}, code);
  return result === 1;
});
