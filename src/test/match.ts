import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  defaultTypeEnv,
  infer,
  stringify,
} from "../core/type.js";
import {
  diff,
  equal,
  showOddValue,
} from "../core/util.js";

test("Match expression selects correct case", () => {
  const code = `case (3) of 1 = false, 2 = false, 3 = true`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== true)
    `Expected true but got ${result}`;
});

test("Match expression correctly selects wildcard", () => {
  const code = `case (2) of 1 = false, _ = true`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== true)
    `Expected true but got ${result}`;
});

test("Matches do not fall through", () => {
  const code = `case (1) of 1 = true, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== true)
    `Expected true but got ${result}`;
});

test("List pattern case", () => {
  const code = `case ([1, 2]) of [a] = false, [a,b] = a, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 1) `Expected 1 but got ${result}`;
});

test("List rest pattern case", () => {
  const code = `case ([1, 2]) of [...a] = a, [a,b] = false, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (!equal(result, [1, 2]))
    `Expected [1, 2] but got ${result}`;
});

test("Record pattern case", () => {
  const code = `case ({a=1,b=2}) of {a} = false, {a,b} = a, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 1) `Expected 1 but got ${result}`;
});

test("Record rest pattern case", () => {
  const code = `case ({a=1,b=2}) of {...x} = x, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (!equal(result, { a: 1, b: 2 }))
    `Expected { a: 1, b: 2 } but got ${result}`;
});

test("Match expressions do not pollute scope", () => {
  const code = `case (1) of {a,b,c} = a + b + c, _ = false`;
  const [, , env] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (!equal(env, defaultEnv))
    return showOddValue(diff(defaultEnv, env));
});

test("Type inference", () => {
  const code = `
		map f xs = case xs of
			[] = [],
			[x, ...xs] = prepend (f x) (map f xs);
	`;
  const [type] = infer(
    parse(code),
    defaultTypeEnv,
    code
  );

  const expected = "(a -> b) -> List a -> List b";
  if (stringify(type) !== expected)
    return `Expected\n  ${expected}\nBut got\n  ${stringify(
      type,
      { color: true }
    )}`;
});
