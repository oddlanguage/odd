import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  defaultTypeEnv,
  infer,
  numberType,
  stringify,
} from "../core/type.js";
import { equal, showOddValue } from "../core/util.js";

test("The type of a class expression is itself", () => {
  const code = `class Eq a where (==) : a -> a -> Boolean`;
  const [type] = infer(
    parse(code),
    defaultTypeEnv,
    code
  );
  if (
    !/class Eq (\w+) where \(==\) : \1 -> \1 -> Boolean/.test(
      stringify(type)
    )
  ) {
    throw `Expected:\n  ${code}\nBut got\n  ${stringify(
      type,
      { colour: true, normalise: true }
    )}`;
  }
});

test("Class expressions extend the type environment", () => {
  const code = `class Eq a where (==) : a -> a -> Boolean`;
  const [type, , env] = infer(
    parse(code),
    defaultTypeEnv,
    code
  );
  if (!env["Eq"]) {
    throw `Environment does not contain "Eq" class.`;
  }
  if (env["Eq"] !== type) {
    throw `Expected env["Eq"] to be:\n  ${stringify(
      env["Eq"]
    )}\nBut got:\n  ${stringify(type, {
      colour: true,
      normalise: true,
    })}`;
  }
});

test("List Never propagation", () => {
  const code = `prepend 1 []`;
  const parsed = parse(code);
  const [type] = infer(parsed, defaultTypeEnv, code);
  if (stringify(type) !== "List Number") {
    return `Expected List Number but got ${stringify(
      type,
      {
        colour: true,
        normalise: true,
      }
    )}`;
  }
  const [value] = _eval(parsed, defaultEnv, code);
  if (!equal(value, [1])) {
    return `Expected [ 1 ] but got ${showOddValue(
      value
    )}`;
  }
});

test("Never type short-circuit", () => {
  const code = `foo x = panic x`;
  const [type] = infer(
    parse(code),
    defaultTypeEnv,
    code
  );
  if (stringify(type) !== "String -> Never") {
    return `Expected String -> Never but got ${stringify(
      type,
      { colour: true, normalise: true }
    )}`;
  }
});

test("Never type in patterns", () => {
  const code = `case ([1]) of [] = infinity, [x] = x;`;
  const parsed = parse(code);
  const [type] = infer(parsed, defaultTypeEnv, code);
  if (stringify(type) !== "Number") {
    return `Expected ${stringify(numberType, {
      colour: true,
      normalise: true,
    })} but got ${stringify(type, {
      colour: true,
      normalise: true,
    })}`;
  }
  const [value] = _eval(parsed, defaultEnv, code);
  if (!equal(value, 1)) {
    return `Expected ${showOddValue(
      1
    )} but got ${showOddValue(value)}`;
  }
});

// TODO: Instances are not implemented yet
// test("Instance expressions create new values for each member", () => {
//   const code = `instance Eq a where (==) = nothing`;
//   const [value, , env] = _eval(
//     parse(code),
//     defaultEnv,
//     code
//   );
//   if (value !== nothing) {
//     throw `Instance expression yielded a non-nothing value: "${showOddValue(
//       value
//     )}".`;
//   }
//   if (!env["=="]) {
//     throw `Environment does not contain "==" function.`;
//   }
//   if (typeof env["=="] !== "function") {
//     throw `Expected type of "==" to be "(Eq a) => a -> a -> Boolean" but got "${typeof env[
//       "=="
//     ]}".`;
//   }
// });
