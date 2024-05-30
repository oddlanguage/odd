import * as fs from "node:fs/promises";
import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import { equal, showOddValue } from "../core/util.js";

test("Modules export all values in global scope", async () => {
  let _result: string | undefined;
  try {
    await fs.writeFile("module.odd", "a=1;b=1;");
    const code = `import ''module''`;
    const [mod] = _eval(parse(code), defaultEnv, code);
    const result = await mod;
    const expected = { a: 1, b: 1 };
    if (!equal(result, expected)) {
      _result = `Expected ${showOddValue(
        expected
      )} but got ${showOddValue(result)}`;
    }
  } catch (err: any) {
    _result = err.toString();
  } finally {
    await fs.unlink("module.odd");
    return _result;
  }
});

test("Importing a non-existent module throws an error", async () => {
  const code = `import ''bogus'';`;
  try {
    const [result] = _eval(
      parse(code),
      defaultEnv,
      code
    );
    await result;
    return `Expected an error to be raised.`;
  } catch (err: any) {
    if (
      !/cannot resolve module ".*bogus.*"/i.test(err)
    ) {
      return (
        "Expected an error like:" +
        `\n  Cannot resolve module "bogus"` +
        "\nBut got:" +
        `\n  ${err.toString()}`
      );
    }
  }
});
