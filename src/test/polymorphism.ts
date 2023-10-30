import { inspect } from "util";
import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  defaultTypeClasses,
  defaultTypeEnv,
  infer,
  stringify,
} from "../core/type.js";
import { equal, serialise } from "../core/util.js";

test("Typeclass polymorphism", () => {
  const input = "(==) 1";
  const [type] = infer(
    parse(input),
    defaultTypeEnv,
    defaultTypeClasses,
    input
  );
  if (type.type !== "constraint") {
    return `Expected a constrained type but got a "${type.type}".`;
  }
  if (!type.constraints[0]?.[0]) {
    return `Expected a type variable.`;
  }
  if (type.constraints[0]?.[1]?.type !== "class") {
    return `Expected a class constraining type variable ${stringify(
      type.constraints[0]?.[0]!
    )}`;
  }
  if (
    type.constraints[0][1].name.toString() !==
    "Symbol(Eq)"
  ) {
    return `Expected the resulting type to be constrained by the "Eq" typeclass.`;
  }
  if (type.child.type !== "parametric") {
    return `Expected the constrained type to be a parametric type.`;
  }
  if (
    type.child.atom.name.toString() !==
    "Symbol(Lambda)"
  ) {
    return `Expected the constrained type to be a lambda.`;
  }
  if (
    !equal(
      type.constraints[0][0],
      type.child.children[0]
    )
  ) {
    return `Expected the lambda parameter and constraint to be the same type.`;
  }
});

test("Functor class", () => {
  const input = `
class Functor f where
	map : (a -> b) -> f a -> f b;
instance Functor List where
	map f xs = case xs of
		[] = [],
		[x, ...tail] = prepend (f x) (map f tail);
double x = x * 2;
map double [2, 4, 6];
	`.trim();
  const [type, , env, classes] = infer(
    parse(input),
    defaultTypeEnv,
    defaultTypeClasses,
    input
  );
  const [value] = _eval(
    parse(input),
    defaultEnv,
    input
  );
  if (!equal(value, [4, 8, 12])) {
    return `Expected [4, 8, 12] but got ${inspect(
      value
    )}`;
  }
  return serialise({ type, env, classes });
});
