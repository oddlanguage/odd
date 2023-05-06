import parse from "../core/odd.js";
import test from "../core/test.js";
import {
  booleanType,
  defaultTypeEnv,
  infer,
  nothingType,
  numberType,
  stringType,
  stringify,
} from "../core/type.js";

test("Redefining a value raises an error", () => {
  const code = `a=1;a=2`;
  try {
    infer(parse(code), defaultTypeEnv, code);
    return "Expected an error to be raised";
  } catch (_) {}
});

test("Simple types", () => {
  const error = Object.entries({
    "1": numberType,
    "''hey''": stringType,
    true: booleanType,
    nothing: nothingType,
  })
    .map(
      ([input, type]) =>
        [
          type,
          infer(
            parse(input),
            defaultTypeEnv,
            input
          )[0],
        ] as const
    )
    .find(([expected, got]) => expected !== got);

  if (error)
    return `${stringify(error[0])} !== ${stringify(
      error[1]
    )}`;
});

test("Lambda parameter and return type", () => {
  const input = "a -> a * a";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );

  const got = stringify(type);
  const expected = "Number -> Number";
  if (got !== expected)
    return `Expected: ${expected}\nGot:      ${got}`;
});

test("Higher order inference", () => {
  const input = "map (a -> a * a)";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );

  const got = stringify(type);
  const expected = "List Number -> List Number";
  if (got !== expected)
    return `Expected: ${expected}\nGot:      ${got}`;
});

test("Stringification parentheses", () => {
  const input = "f a b -> f b a";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );
  if (
    !/\((.+?) -> (.+?) -> (.+?)\) -> \2 -> \1 -> \3/.test(
      stringify(type)
    )
  )
    return `Improperly parenthesised type: ${stringify(
      type
    )}`;
});

test("Records", () => {
  const input = "{ a = 1, b x = x * 2 }";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );

  const got = stringify(type);
  const expected =
    "{ a : Number, b : Number -> Number }";
  if (got !== expected)
    return `Expected: ${expected}\nGot:      ${got}`;
});

test("Lists", () => {
  const input = "[1, 2, 3]";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );

  const got = stringify(type);
  const expected = "List Number";
  if (got !== expected)
    return `Expected: ${expected}\nGot:      ${got}`;
});

test("Record lambda parameter", () => {
  const input = "{ a } -> a * 2";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );

  const got = stringify(type);
  const expected = "{ a : Number } -> Number";
  if (got !== expected)
    return `Expected: ${expected}\nGot:      ${got}`;
});

test("List lambda parameter", () => {
  const input = "[a] -> a * 2";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );

  const got = stringify(type);
  const expected = "List Number -> Number";
  if (got !== expected)
    return `Expected: ${expected}\nGot:      ${got}`;
});

test("Polymorphic lists", () => {
  const input = "[1, ''a'']";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );

  const got = stringify(type);
  const expected = "List (Number | String)";
  if (got !== expected)
    return `Expected: ${expected}\nGot:      ${got}`;
});
