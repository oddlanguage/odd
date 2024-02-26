import _eval from "../core/eval.js";
import parse, {
  defaultEnv,
  nothing,
} from "../core/odd.js";
import test from "../core/test.js";
import {
  defaultTypeEnv,
  infer,
  stringify,
} from "../core/type.js";
import { showOddValue } from "../core/util.js";

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
      type
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
    )}\nBut got:\n  ${stringify(type)}`;
  }
});

test("Instance expressions create new values for each member", () => {
  const code = `instance Eq a where (==) = nothing`;
  const [value, , env] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  if (value !== nothing) {
    throw `Instance expression yielded a non-nothing value: "${showOddValue(
      value
    )}".`;
  }
  if (!env["=="]) {
    throw `Environment does not contain "==" function.`;
  }
  if (typeof env["=="] !== "function") {
    throw `Expected type of "==" to be "(Eq a) => a -> a -> Boolean" but got "${typeof env[
      "=="
    ]}".`;
  }
});
