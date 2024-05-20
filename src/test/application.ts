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
  ansi,
  diff,
  equal,
  showOddValue,
} from "../core/util.js";

test("Function application", () => {
  const code = `f x=x+1;f 0`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 1)
    return `Expected 1 but got ${result}`;
});

test("Literal application", () => {
  const code = `(x -> x + 1) 0`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 1)
    return `Expected 1 but got ${result}`;
});

test("Record access", () => {
  const code = `{a=1} ''a''`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 1)
    return `Expected 1 but got ${result}`;
});

test("List access", () => {
  const code = `[1] 0`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 1)
    return `Expected 1 but got ${result}`;
});

test("Application has higher precedence than infix", () => {
  const code = `f x=x;f 1 + f 1`;
  const parsed = parse(code);
  const [result] = _eval(parsed, defaultEnv, code);

  if (result !== 2)
    return `Expected 2 but got ${result}`;
});

test("Record access and application", () => {
  const code1 = `numbers={a=1,b=1};numbers ''a'' + numbers ''b'';`;
  const code2 = `numbers={a=1,b=1};(numbers ''a'') + (numbers ''b'');`;
  const tree1 = parse(code1);
  const tree2 = parse(code2);
  const [result] = _eval(tree1, defaultEnv, code1);

  if (
    !equal(
      tree1,
      tree2,
      ([key]) => !["offset", "size"].includes(key)
    )
  )
    return showOddValue(diff(tree1, tree2));
  if (result !== 2)
    return `Expected 2 but got ${result}`;
});

test("Record access types", () => {
  const code = `{ a =  1 } ''a''`;
  const [type] = infer(
    parse(code),
    defaultTypeEnv,
    code
  );
  if (type !== numberType) {
    return `Expected ${stringify(numberType, {
      colour: true,
    })} but got ${stringify(type, {
      colour: true,
      normalise: true,
    })}`;
  }
});

test("Can't access records with wrong type", () => {
  const code = `{ a =  1 } 0`;
  try {
    const [type] = infer(
      parse(code),
      defaultTypeEnv,
      code
    );
    return `Expected type inference to fail, but got "${stringify(
      type,
      { colour: true, normalise: true }
    )}"`;
  } catch (err) {
    if (
      typeof err !== "string" ||
      !ansi
        .clear(err)
        .match(
          /Cannot index.+Record.+String.+Number.+with.+Number/
        )
    ) {
      throw err;
    }
  }
});

test("List access types", () => {
  const code = `[1] 0`;
  const [type] = infer(
    parse(code),
    defaultTypeEnv,
    code
  );
  if (type !== numberType) {
    return `Expected ${stringify(numberType, {
      colour: true,
    })} but got ${stringify(type, {
      colour: true,
      normalise: true,
    })}`;
  }
});

test("Can't access lists with wrong type", () => {
  const code = `[1] ''a''`;
  try {
    const [type] = infer(
      parse(code),
      defaultTypeEnv,
      code
    );
    return `Expected type inference to fail, but got "${stringify(
      type,
      { colour: true, normalise: true }
    )}"`;
  } catch (err) {
    if (
      typeof err !== "string" ||
      !ansi
        .clear(err)
        .match(
          /Cannot index.+List.+Number.+with.+String/
        )
    ) {
      throw err;
    }
  }
});

test("Type inference rejects wrong arguments", () => {
  const code = `
	foo x = case x of
		true = true,
		false = false;
	foo 0;
	`;
  try {
    const [type] = infer(
      parse(code),
      defaultTypeEnv,
      code
    );
    return `Expected type inference to fail, but got type "${stringify(
      type,
      { colour: true, normalise: true }
    )}"`;
  } catch (err) {
    if (
      typeof err !== "string" ||
      !ansi
        .clear(err)
        .match(/Cannot unify.+Number.+and.+Boolean/)
    ) {
      throw err;
    }
  }
});
