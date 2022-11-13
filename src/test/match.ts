import _eval from "../eval.js";
import parse from "../odd.js";
import test from "../test.js";

test("Match expression selects correct case", () => {
  const code = `case (3) of 1 = nothing, 2 = nothing, 3 = true`;
  const [result] = _eval(
    parse(code),
    { true: true, nothing: Symbol("nothing") },
    code
  );
  return result === true;
});

test("Match expression correctly selects placeholder", () => {
  const code = `case (2) of 1 = nothing, _ = true`;
  const [result] = _eval(
    parse(code),
    { true: true, nothing: Symbol("nothing") },
    code
  );
  return result === true;
});

test("Matches do not fall through", () => {
  const code = `case (1) of 1 = true, _ = false`;
  const [result] = _eval(
    parse(code),
    { true: true, false: false },
    code
  );
  return result === true;
});
