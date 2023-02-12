import fs from "node:fs/promises";
import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import { equal } from "../core/util.js";

test("Modules export all values in global scope", async () => {
  try {
    await fs.writeFile("module.odd", "a=1;b=1;");
    const code = `import ''module'';`;
    const [value] = _eval(
      parse(code),
      defaultEnv,
      code
    );
    return equal(value, { a: 1, b: 1 });
  } finally {
    await fs.unlink("module.odd");
  }
});

test("Importing a non-existent module throws an error", () => {
  const code = `import ''bogus'';`;
  try {
    _eval(parse(code), defaultEnv, code);
    return false;
  } catch (err: any) {
    return /cannot resolve module "bogus"/i.test(err);
  }
});
