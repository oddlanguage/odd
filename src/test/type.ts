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
    return false;
  } catch (_) {
    return true;
  }
});

test("Simple types", () =>
  Object.entries({
    "1": numberType,
    "''hey''": stringType,
    true: booleanType,
    nothing: nothingType,
  }).every(
    ([input, type]) =>
      infer(parse(input), defaultTypeEnv, input)[0] ===
      type
  ));

test("Lambda parameter and return type", () => {
  const input = "a -> a * a";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );
  return stringify(type) === "Number -> Number";
});

test("Higher order inference", () => {
  const input = "map (a -> a * a)";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );
  return (
    stringify(type) === "List Number -> List Number"
  );
});

test("Stringification parentheses", () => {
  const input = "f a b -> f b a";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );
  return /\((.+?) -> (.+?) -> (.+?)\) -> \2 -> \1 -> \3/.test(
    stringify(type)
  );
});

test("Records", () => {
  const input = "{ a = 1, b x = x * 2 }";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );
  return (
    stringify(type) ===
    "{ a : Number, b : Number -> Number }"
  );
});

test("Lists", () => {
  const input = "[1, 2, 3]";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );
  return stringify(type) === "List Number";
});

test("Record lambda parameter", () => {
  const input = "{ a } -> a * 2";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );
  return (
    stringify(type) === "{ a : Number } -> Number"
  );
});

test("List lambda parameter", () => {
  const input = "[a] -> a * 2";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );
  return stringify(type) === "List Number -> Number";
});

test("Polymorphic lists", () => {
  const input = "[1, ''a'']";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    input
  );
  return stringify(type) === "List (Number | String)";
});
