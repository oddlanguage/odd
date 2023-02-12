import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import { equal } from "../core/util.js";

test("Function application", () => {
  const code = `f x=x+1;f 0`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === 1;
});

test("Literal application", () => {
  const code = `(x -> x + 1) 0`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === 1;
});

test("Record access", () => {
  const code = `{a=1} ''a''`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === 1;
});

test("List access", () => {
  const code = `[1] 0`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === 1;
});

test("Application has higher precedence than infix", () => {
  const code = `f x=x;f 1 + f 1`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );
  return result === 2;
});

test("Record access and application", () => {
  const code1 = `numbers ''a'' + numbers ''b'';`;
  const code2 = `(numbers ''a'') + (numbers ''b'');`;
  const tree1 = parse(code1);
  const tree2 = parse(code2);
  const [result] = _eval(
    tree1,
    {
      ...defaultEnv,
      numbers: { a: 1, b: 1 }
    },
    code1
  );
  return (
    equal(
      tree1,
      tree2,
      ([key]) => !["offset", "size"].includes(key)
    ) && result === 2
  );
});
