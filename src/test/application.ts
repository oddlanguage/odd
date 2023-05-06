import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  diff,
  equal,
  serialise,
} from "../core/util.js";

test("Function application", () => {
  const code = `f x=x+1;f 0`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 1)
    return `Expected 1 but got ${result}`;
});

test("Literal application", () => {
  const code = `(x -> x + 1) 0`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 1)
    return `Expected 1 but got ${result}`;
});

test("Record access", () => {
  const code = `{a=1} ''a''`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 1)
    return `Expected 1 but got ${result}`;
});

test("List access", () => {
  const code = `[1] 0`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 1)
    return `Expected 1 but got ${result}`;
});

test("Application has higher precedence than infix", () => {
  const code = `f x=x;f 1 + f 1`;
  const [result] = _eval(
    parse(code),
    defaultEnv,
    code
  );

  if (result !== 2)
    return `Expected 2 but got ${result}`;
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
      numbers: { a: 1, b: 1 },
    },
    code1
  );

  if (
    !equal(
      tree1,
      tree2,
      ([key]) => !["offset", "size"].includes(key)
    )
  )
    return serialise(diff(tree1, tree2));
  if (result !== 2)
    return `Expected 2 but got ${result}`;
});
