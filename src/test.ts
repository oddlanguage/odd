import {
  isNode,
  isToken,
  Node,
  Token
} from "./combinators.js";

type Value = Node | Token | string;

type Difference =
  | Readonly<{
      key: string;
      a: Value;
      b: Value;
    }>
  | Difference[];

const zip =
  <T>(as: T[]) =>
  (bs: T[]) => {
    if (as.length !== bs.length)
      throw new Error(
        "Can't zip lists of unequal length."
      );
    return as.map((x, i) => [x, bs[i]!]) as [T, T][];
  };

const compareNodes = (
  a: Node,
  b: Node
): Difference | undefined => {
  const diff = [
    a.type !== b.type && { key: "type", a, b },
    ...zip(a.children)(b.children).map(compare)
  ]
    .filter(Boolean)
    .flat(Infinity as 0) as Difference[];
  return diff.length ? diff : undefined;
};

const compareTokens = (
  a: Token,
  b: Token
): Difference | undefined => {
  const diff = (
    ["lexeme", "type", "offset"] as Array<keyof Token>
  )
    .map(key => a[key] !== b[key] && { key, a, b })
    .filter(Boolean) as Difference[];
  return diff.length ? diff : undefined;
};

const compare = ([a, b]: [Value, Value]):
  | Difference
  | undefined =>
  (isNode(a) && isNode(b)
    ? compareNodes(a, b)
    : isToken(a) && isToken(b)
    ? compareTokens(a, b)
    : a !== b && { key: "value", a, b }) as Difference;

export const diff =
  (a: Node) =>
  (b: Node): Difference | undefined => {
    const problems = [compare([a, b])].flat(
      Infinity as 0
    ) as Difference[];
    return problems.length ? problems : undefined;
  };
