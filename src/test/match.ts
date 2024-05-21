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
    `Expected\n  true\nbut got\n  ${result}`;
});

test("Match expression correctly selects wildcard", () => {
  const code = `case (2) of 1 = false, _ = true`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== true)
    `Expected\n  true\nbut got\n  ${result}`;
});

test("Matches do not fall through", () => {
  const code = `case (1) of 1 = true, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== true)
    `Expected\n  true\nbut got\n  ${result}`;
});

test("List pattern case", () => {
  const code = `case ([1, 2]) of [a] = false, [a,b] = a, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 1)
    `Expected\n  1\nbut got\n  ${result}`;
});

test("List rest pattern case", () => {
  const code = `case ([1, 2]) of [...a] = a, [a,b] = false, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (!equal(result, [1, 2]))
    `Expected\n  [1, 2]\nbut got\n  ${result}`;
});

test("Record pattern case", () => {
  const code = `case ({a=1,b=2}) of {a} = false, {a,b} = a, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 1)
    `Expected\n  1\nbut got\n  ${result}`;
});

test("Record rest pattern case", () => {
  const code = `case ({a=1,b=2}) of {...x} = x, _ = false`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (!equal(result, { a: 1, b: 2 }))
    return `Expected\n  { a: 1, b: 2 }\nbut got\n  ${result}`;
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

test("Application constraint propagation in case expression", () => {
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

  const expected =
    /\(([^ ]+) -> ([^)]+)\) -> List \1 -> List \2/;
  if (!expected.test(stringify(type)))
    return `Expected\n  ${
      expected.source
    }\nBut got\n  ${stringify(type, {
      colour: true,
      normalise: true,
    })}`;
});

test("List destructuring in case expression", () => {
  const code = `
		map f xs = case xs of
			[] = [],
			[x, ...xs] = [f x, ...(map f xs)];
	`;
  const [type] = infer(
    parse(code),
    defaultTypeEnv,
    code
  );

  const expected =
    /\(([^ ]+) -> ([^)]+)\) -> List \1 -> List \2/;
  if (!expected.test(stringify(type)))
    return `Expected\n  ${
      expected.source
    }\nBut got\n  ${stringify(type, {
      colour: true,
      normalise: true,
    })}`;
});

test("Match expressions are exhaustive", () => {
  // TODO: Implement lol
  return "Not implemented.";
});
