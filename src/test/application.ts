import _eval from "../core/eval.js";
import parse, { defaultEnv } from "../core/odd.js";
import test from "../core/test.js";
import {
  defaultTypeEnv,
  infer,
  numberType,
  stringify,
} from "../core/type.js";
import {
  dedent,
  diff,
  equal,
  serialise,
} from "../core/util.js";

test("Function application", () => {
  const code = `f x=x+1;f 0`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);
  const [type] = infer(parsed, defaultTypeEnv, code);

  if (result !== 1)
    return `Expected 1 but got ${result}`;
  if (type !== numberType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("Literal application", () => {
  const code = `(x -> x + 1) 0`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);
  const [type] = infer(parsed, defaultTypeEnv, code);

  if (result !== 1)
    return `Expected 1 but got ${result}`;
  if (type !== numberType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("Record access", () => {
  const code = `{a=1} ''a''`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);
  const [type] = infer(parsed, defaultTypeEnv, code);

  if (result !== 1)
    return `Expected 1 but got ${result}`;
  if (type !== numberType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("List access", () => {
  const code = `[1] 0`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);
  const [type] = infer(parsed, defaultTypeEnv, code);

  if (result !== 1)
    return `Expected 1 but got ${result}`;
  if (stringify(type) !== "Number | Nothing")
    return `Expected Number | Nothing but got ${stringify(
      type
    )}`;
});

test("Application has higher precedence than infix", () => {
  const code = `f x=x;f 1 + f 1`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);
  const [type] = infer(parsed, defaultTypeEnv, code);

  if (result !== 2)
    return `Expected 2 but got ${result}`;
  if (type !== numberType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("Record access and application", () => {
  const code1 = `numbers={a=1,b=1};numbers ''a'' + numbers ''b'';`;
  const code2 = `numbers={a=1,b=1};(numbers ''a'') + (numbers ''b'');`;
  const tree1 = parse(code1);
  const tree2 = parse(code2);
  const [result] = _eval(tree1, defaultEnv, code1);
  const [type] = infer(tree1, defaultTypeEnv, code1);

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
  if (type !== numberType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("Union collapse", () => {
  const code = `head [1]`;
  const [type] = infer(
    parse(code),
    defaultTypeEnv,
    code
  );

  if (type !== numberType)
    return `Expected Number but got ${stringify(
      type
    )}`;
});

test("Argument type mismatch", () => {
  const code = dedent(`
		{a} #$% b = a+b;
		{a=''1''} #$% 2;
	`);
  try {
    const [type] = infer(
      parse(code),
      defaultTypeEnv,
      code
    );
    return `Expected to fail typechecking but got ${stringify(
      type
    )}`;
  } catch (_) {}
});

test("Contstraint application", () => {
  const code = `(==) 1`;
  const [type] = infer(
    parse(code),
    defaultTypeEnv,
    code
  );

  if (stringify(type) !== "(Eq a) => a -> Boolean")
    return `Expected (Eq a) => a -> Boolean but got ${stringify(
      type
    )}`;
});
