import fs from "node:fs/promises";
import _eval from "../eval.js";
import parse, { defaultEnv } from "../odd.js";
import test from "../test.js";
import { equal } from "../util.js";

test("Modules export all values in global scope", async () => {
  await fs.writeFile("module.odd", "a=1;b=1;");
  const code = `import ''module'';`;
  const [value] = _eval(parse(code), defaultEnv, code);
  await fs.unlink("module.odd");
  return equal(await value, { a: 1, b: 1 });
});

test("Importing a non-existent module throws an error", async () => {
  const code = `import ''bogus'';`;
  const [value] = _eval(parse(code), defaultEnv, code);
  return /cannot resolve module "bogus"/i.test(
    await value
  );
});
