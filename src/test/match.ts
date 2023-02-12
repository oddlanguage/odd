import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import { equal } from "../core/util.js";

test("Match expression selects correct case", () => {
  const code = `case (3) of 1 = false, 2 = false, 3 = true`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === true;
});

test("Match expression correctly selects wildcard", () => {
  const code = `case (2) of 1 = false, _ = true`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === true;
});

test("Matches do not fall through", () => {
  const code = `case (1) of 1 = true, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === true;
});

test("List pattern case", () => {
  const code = `case ([1, 2]) of [a] = false, [a,b] = a, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === 1;
});

test("List rest pattern case", () => {
  const code = `case ([1, 2]) of [...a] = a, [a,b] = false, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return equal(result, [1, 2]);
});

test("Record pattern case", () => {
  const code = `case ({a=1,b=2}) of {a} = false, {a,b} = a, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === 1;
});

test("Record rest pattern case", () => {
  const code = `case ({a=1,b=2}) of {...x} = x, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return equal(result, { a: 1, b: 2 });
});

test("Match expressions do not pollute scope", () => {
  const code = `case (1) of {a,b,c} = a + b + c, _ = false`;
  const [, , env] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return equal(env, defaultEnv);
});
