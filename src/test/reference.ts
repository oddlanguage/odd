import _eval from "../eval.js";
import parse, { defaultEnv } from "../odd.js";
import test from "../test.js";

test("Redefining a value raises an error", () => {
  const code = `a=1;a=2`;
  try {
    _eval(parse(code), defaultEnv, code);
    return false;
  } catch (_) {
    return true;
  }
});
