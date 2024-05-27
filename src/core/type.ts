import { operatorRegex } from "./odd.js";
import { Branch, Token, Tree } from "./parse.js";
import { makeError } from "./problem.js";
import {
  ReadonlyRecord,
  ansi,
  equal,
  union,
  unique,
} from "./util.js";

export type Type =
  | symbol
  | TypeVar
  | ParametricType
  | ConstrainedType
  | TypeClass;

type TypeVar = Readonly<{ type: "var"; var: number }>;

type ParametricType = Readonly<{
  type: "parametric";
  constructor: Type;
  infix?: string;
  children: ReadonlyArray<Type>;
}>;

type ConstrainedType = Readonly<{
  type: "constrained";
  constructor: Type;
  class: TypeClass;
  var: TypeVar;
}>;

type TypeClass = Readonly<{
  type: "class";
  name: symbol;
  var: TypeVar;
  methods: ReadonlyRecord<string, Type>;
}>;

const newConstrainedType = (
  type: Type,
  _class: TypeClass,
  _var: TypeVar
): ConstrainedType => ({
  type: "constrained",
  constructor: type,
  class: _class,
  var: _var,
});

// TODO: This is to make the compiler shut up.
// Remove when constrained types are implemented.
newConstrainedType;

const newClass = (
  name: string,
  _var: TypeVar,
  methods: ReadonlyRecord<string, Type>
): TypeClass => ({
  type: "class",
  name: Symbol(name),
  var: _var,
  methods,
});

type TypeEnv = Readonly<Record<string, Type>>;

/** This type should ***never*** be used and should ***never*** leak
 * from the equals functions, as it will destroy all type information.
 * Later on, this should be removed in favour of typeclasses.
 */
export const anyType = Symbol("Any");

export const neverType = Symbol("Never");
export const lambdaType = Symbol("Lambda");
export const recordType = Symbol("Record");
export const listType = Symbol("List");

const newLambda = (
  input: Type,
  output: Type
): ParametricType => ({
  type: "parametric",
  constructor: lambdaType,
  infix: "->",
  children: [input, output],
});

const newList = (type: Type): ParametricType => ({
  type: "parametric",
  constructor: listType,
  children: [type],
});

const newRecord = (
  key: Type,
  type: Type
): ParametricType => ({
  type: "parametric",
  constructor: recordType,
  children: [key, type],
});

let __LAST_TYPE_VAR = 0;
const newVar = (): TypeVar => ({
  type: "var",
  var: __LAST_TYPE_VAR++,
});

export const booleanType = Symbol("Boolean");
export const numberType = Symbol("Number");
export const nothingType = Symbol("Nothing");
export const stringType = Symbol("String");

const isAtomic = (type: Type): type is symbol =>
  typeof type === "symbol";

const isParametric = (
  type: Type
): type is ParametricType =>
  (type as ParametricType).type === "parametric";

const isVar = (type: Type): type is TypeVar =>
  (type as TypeVar).type === "var";

const isConstrainedType = (
  type: Type
): type is ConstrainedType =>
  (type as ConstrainedType).type === "constrained";

const isClass = (type: Type): type is TypeClass =>
  (type as TypeClass).type === "class";

const free = (type: Type): ReadonlyArray<TypeVar> => {
  if (isAtomic(type)) {
    return [];
  } else if (isVar(type)) {
    return [type];
  } else if (isParametric(type)) {
    return unique(
      type.children.flatMap(free),
      x => x.var
    );
  } else if (isClass(type)) {
    return [type.var];
  } else if (isConstrainedType(type)) {
    return free(type.constructor);
  }
  throw `Cannot get free variables from ${stringify(
    type,
    { colour: true, normalise: true }
  )}`;
};

const normalise = (type: Type): Type => {
  const freeVars = free(type);

  const sub = (type: Type): Type => {
    if (isAtomic(type)) {
      return type;
    } else if (isVar(type)) {
      return {
        ...type,
        var: freeVars.findIndex(
          x => x.var === type.var
        ),
      };
    } else if (isParametric(type)) {
      return {
        ...type,
        children: type.children.map(sub),
      };
    } else if (isClass(type)) {
      return {
        ...type,
        var: sub(type.var) as TypeVar,
        methods: Object.fromEntries(
          Object.entries(type.methods).map(
            ([k, v]) => [k, sub(v)]
          )
        ),
      };
    } else if (isConstrainedType(type)) {
      return {
        ...type,
        constructor: sub(type.constructor),
        var: sub(type.var) as TypeVar,
        class: sub(type.class) as TypeClass,
      };
    }
    throw `Cannot normalise ${stringify(type, {
      colour: true,
      normalise: true,
    })}`;
  };

  return sub(type);
};

const alphabet = "abcdefghijklmnopqrstuvwxyz";
const subscript = "₀₁₂₃₄₅₆₇₈₉";
export const stringify = (
  type: Type,
  options: {
    colour?: boolean;
    normalise?: boolean;
  } = {}
): string => {
  if (options.normalise) {
    // TODO: This is super ugly. Don't mutate!
    type = normalise(type);
    options.normalise = false;
  }

  if (isAtomic(type)) {
    const str = type.description!;
    return options.colour ? ansi.yellow(str) : str;
  } else if (isVar(type)) {
    const str =
      alphabet[type.var] ??
      alphabet[type.var % alphabet.length] +
        [
          ...Math.floor(
            type.var / alphabet.length
          ).toString(),
        ]
          .map(x => subscript[Number(x)])
          .join("");
    return options.colour ? ansi.italic(str) : str;
  } else if (isParametric(type)) {
    if (type.infix) {
      return type.children
        .map((child, i) =>
          i === 0 &&
          isParametric(child) &&
          child.constructor === type.constructor
            ? `(${stringify(child, options)})`
            : stringify(child, options)
        )
        .join(
          ` ${
            options.colour
              ? ansi.magenta(type.infix)
              : type.infix
          } `
        );
    } else {
      return [type.constructor, ...type.children]
        .map(type => stringify(type, options))
        .join(" ");
    }
  } else if (isConstrainedType(type)) {
    return `(${
      options.colour
        ? ansi.blue(type.class.name.description!)
        : type.class.name.description
    } ${stringify(type.var, options)}) => ${stringify(
      type.constructor,
      options
    )}`;
  } else if (isClass(type)) {
    return `class ${type.name
      .description!} ${stringify(
      type.var,
      options
    )} where ${Object.entries(type.methods)
      .map(
        ([k, v]) =>
          `${
            k.match(operatorRegex)?.[0] === k
              ? `(${k})`
              : k
          } : ${stringify(v, options)}`
      )
      .join(", ")}`;
  }

  throw `Cannot stringify "${
    (type as Exclude<Type, symbol>).type ?? type
  }"`;
};

export const defaultTypeEnv: TypeEnv = {
  "==": newLambda(
    anyType,
    newLambda(anyType, booleanType)
  ),
  "!=": newLambda(
    anyType,
    newLambda(anyType, booleanType)
  ),
  "/": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "*": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "+": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "-": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "%": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "^": newLambda(
    numberType,
    newLambda(numberType, numberType)
  ),
  "&": newLambda(
    booleanType,
    newLambda(booleanType, booleanType)
  ),
  "|": newLambda(
    booleanType,
    newLambda(booleanType, booleanType)
  ),
  true: booleanType,
  false: booleanType,
  nothing: nothingType,
  infinity: numberType,
  not: newLambda(booleanType, booleanType),
  "++": (() => {
    const a = newVar();
    return newLambda(
      newList(a),
      newLambda(newList(a), newList(a))
    );
  })(),
  range: newLambda(numberType, newList(numberType)),
  "range-from": newLambda(
    numberType,
    newLambda(numberType, newList(numberType))
  ),
  // map: newLambda(
  //   newLambda(a, b),
  //   newLambda(newList(a), newList(b))
  // ),
  filter: (() => {
    const a = newVar();
    return newLambda(
      newLambda(a, booleanType),
      newLambda(newList(a), newList(a))
    );
  })(),
  fold: (() => {
    const a = newVar();
    const b = newVar();
    return newLambda(
      newLambda(b, newLambda(a, b)),
      newLambda(b, newLambda(newList(a), b))
    );
  })(),
  scan: (() => {
    const a = newVar();
    const b = newVar();
    return newLambda(
      newLambda(b, newLambda(a, b)),
      newLambda(b, newLambda(newList(a), newList(b)))
    );
  })(),
  reverse: (() => {
    const a = newVar();
    return newLambda(newList(a), newList(a));
  })(),
  tail: (() => {
    const a = newVar();
    return newLambda(newList(a), newList(a));
  })(),
  drop: (() => {
    const a = newVar();
    return newLambda(
      numberType,
      newLambda(newList(a), newList(a))
    );
  })(),
  "|>": (() => {
    const a = newVar();
    const b = newVar();
    return newLambda(a, newLambda(newLambda(a, b), b));
  })(),
  "<|": (() => {
    const a = newVar();
    const b = newVar();
    return newLambda(newLambda(a, b), newLambda(a, b));
  })(),
  "<.": (() => {
    const a = newVar();
    const b = newVar();
    const c = newVar();
    return newLambda(
      newLambda(b, c),
      newLambda(newLambda(a, b), newLambda(a, c))
    );
  })(),
  ".>": (() => {
    const a = newVar();
    const b = newVar();
    const c = newVar();
    return newLambda(
      newLambda(a, b),
      newLambda(newLambda(b, c), newLambda(a, c))
    );
  })(),
  prepend: (() => {
    const a = newVar();
    return newLambda(
      a,
      newLambda(newList(a), newList(a))
    );
  })(),
  append: (() => {
    const a = newVar();
    return newLambda(
      a,
      newLambda(newList(a), newList(a))
    );
  })(),
  a: neverType,
  panic: newLambda(stringType, neverType),
  benchmark: (() => {
    const a = newVar();
    const b = newVar();
    return newLambda(newLambda(a, b), numberType);
  })(),
  // "<": Ord a => a -> a -> Boolean,
  // ">": Ord a => a -> a -> Boolean,
  // "<=": Ord a => a -> a -> Boolean,
  // ">=": Ord a => a -> a -> Boolean,
  // "@": Indexable a => b -> a -> a b,
  has: newLambda(
    stringType,
    newLambda(
      newRecord(stringType, anyType),
      booleanType
    )
  ),
  group: (() => {
    const a = newVar();
    return newLambda(
      newLambda(a, stringType),
      newLambda(
        newList(a),
        newRecord(stringType, newList(a))
      )
    );
  })(),
  // replace:
  //   (key: keyof any) =>
  //   (value: any) =>
  //   (target: any) => {
  //     if (Array.isArray(target)) {
  //       const clone = target.slice();
  //       clone.splice(key as number, 1, value);
  //       return clone;
  //     } else {
  //       const clone = { ...target };
  //       clone[key] = value;
  //       return clone;
  //     }
  //   },
  // TODO: Union with nothing
  head: (() => {
    const a = newVar();
    return newLambda(newList(a), a);
  })(),
  last: (() => {
    const a = newVar();
    return newLambda(newList(a), a);
  })(),
  sort: (() => {
    const a = newVar();
    return newLambda(
      newLambda(a, newLambda(a, numberType)),
      newLambda(newList(a), newList(a))
    );
  })(),
  "sort-by": (() => {
    const a = newVar();
    return newLambda(
      newLambda(a, numberType),
      newLambda(newList(a), newList(a))
    );
  })(),
  partition: (() => {
    const a = newVar();
    return newLambda(
      newLambda(a, booleanType),
      newLambda(newList(a), newList(newList(a)))
    );
  })(),
  size: (() => {
    const a = newVar();
    return newLambda(a, numberType);
  })(),
  min: (() => {
    const a = newVar();
    return newLambda(a, newLambda(a, a));
  })(),
  max: (() => {
    const a = newVar();
    return newLambda(a, newLambda(a, a));
  })(),
  show: newLambda(anyType, stringType),
  log: newLambda(anyType, nothingType),
  import: newLambda(
    stringType,
    newRecord(stringType, anyType)
  ),
  print: (() => {
    const a = newVar();
    return newLambda(a, a);
  })(),
};

// TODO: Should probably use a Map for this?
type Substitution = readonly [TypeVar, Type];
type Substitutions = ReadonlyArray<Substitution>;

export const infer = (
  tree: Tree,
  env: TypeEnv,
  input: string
): readonly [Type, Substitutions, TypeEnv] => {
  switch (tree.type) {
    case "program":
      return (tree as Branch).children.reduce(
        ([, , env], branch) =>
          infer(branch, env, input),
        [nothingType, [], env] as ReturnType<
          typeof infer
        >
      );
    case "statement":
    case "expression-statement": {
      return infer(
        (tree as Branch).children[0]!,
        env,
        input
      );
    }
    case "type-declaration":
    case "declaration": {
      const [pattern, value] = (tree as Branch)
        .children as [Tree, Tree];

      const patternVar = newVar();
      const [patterns, patternSubs] = extractPatterns(
        pattern,
        patternVar,
        input
      );
      const [valueType, valueSubs, newEnv] = infer(
        value,
        { ...env, ...patterns },
        input
      );

      const subs = compose(
        compose(valueSubs, patternSubs, tree, input),
        unify(patternVar, valueType, tree, input),
        tree,
        input
      );
      const appliedEnv = applyEnv(
        newEnv,
        subs,
        tree,
        input
      );
      return [valueType, subs, appliedEnv];
    }
    case "number":
      return [numberType, [], env];
    case "string":
      return [stringType, [], env];
    case "type-lambda":
    case "lambda": {
      const [param, body] = (tree as Branch)
        .children as [Tree, Tree];
      const paramVar = newVar();
      const [patterns, paramSubs] = extractPatterns(
        param,
        paramVar,
        input,
        tree.type === "type-lambda" ? env : undefined
      );
      const bodyVar = newVar();
      const [bodyType, bodySubs] = infer(
        body,
        {
          Boolean: booleanType,
          String: stringType,
          Number: numberType,
          Nothing: nothingType,
          ...env,
          ...patterns,
        },
        input
      );
      const allSubs = compose(
        paramSubs,
        compose(
          bodySubs,
          unify(bodyVar, bodyType, body, input),
          tree,
          input
        ),
        tree,
        input
      );

      const lambda = newLambda(
        apply(paramVar, allSubs, tree, input),
        bodyVar
      );

      const finalType = apply(
        lambda,
        allSubs,
        tree,
        input
      );

      return [finalType, allSubs, env];
    }
    case "name":
    case "operator": {
      const { text } = tree as Token;
      if (!(text in env)) {
        throw makeError(input, [
          {
            reason: `Unknown name "${text}".`,
            at: tree.offset,
            size: tree.size,
          },
        ]);
      }
      return [env[text]!, [], env];
    }
    case "infix": {
      const [lhs, op, rhs] = (tree as Branch)
        .children as [Tree, Tree, Tree];

      const [lhsType, lhsSubs, env1] = infer(
        lhs,
        env,
        input
      );
      const [opType, opSubs, env2] = infer(
        op,
        env1,
        input
      );
      const [rhsType, rhsSubs, env3] = infer(
        rhs,
        env2,
        input
      );
      const returnVar = newVar();
      const lambda = newLambda(
        rhsType,
        newLambda(lhsType, returnVar)
      );
      const subs = compose(
        lhsSubs,
        compose(
          opSubs,
          compose(
            rhsSubs,
            unify(opType, lambda, tree, input),
            tree,
            input
          ),
          tree,
          input
        ),
        tree,
        input
      );
      const type = apply(lambda, subs, tree, input);
      const returnType = (
        (type as ParametricType)
          .children[1] as ParametricType
      ).children[1]!;

      return [returnType, subs, env3];
    }
    case "application": {
      const [lhs, rhs] = (tree as Branch).children as [
        Tree,
        Tree
      ];

      const [lhsType, lhsSubs, env1] = infer(
        lhs,
        env,
        input
      );

      // TODO: Implement this through typeclasses
      // e.g. (Indexable a, Index b) => b -> a -> a[b]
      if (isParametric(lhsType)) {
        if (lhsType.constructor === recordType) {
          const [rhsType] = infer(rhs, env1, input);
          if (rhsType !== lhsType.children[0]) {
            throw makeError(input, [
              {
                reason: `Cannot index ${stringify(
                  lhsType,
                  {
                    colour: true,
                    normalise: true,
                  }
                )} with ${stringify(rhsType, {
                  colour: true,
                  normalise: true,
                })}.`,
                at: rhs.offset,
                size: rhs.size,
              },
            ]);
          }
          return [lhsType.children[1]!, lhsSubs, env1];
        } else if (lhsType.constructor === listType) {
          const [rhsType] = infer(rhs, env1, input);
          if (rhsType !== lhsType.children[0]) {
            throw makeError(input, [
              {
                reason: `Cannot index ${stringify(
                  lhsType,
                  {
                    colour: true,
                    normalise: true,
                  }
                )} with ${stringify(rhsType, {
                  colour: true,
                  normalise: true,
                })}.`,
                at: rhs.offset,
                size: rhs.size,
              },
            ]);
          }
          return [lhsType.children[0]!, lhsSubs, env1];
        }
      }

      const argVar = newVar();
      const returnVar = newVar();
      const funVar = newLambda(argVar, returnVar);
      const funSubs = unify(
        funVar,
        lhsType,
        tree,
        input
      );
      const allFunSubs = compose(
        lhsSubs,
        funSubs,
        tree,
        input
      );
      const [argType, argSubs, env2] = infer(
        rhs,
        env1,
        input
      );
      const moreArgSubs = unify(
        argVar,
        argType,
        tree,
        input
      );
      const allArgsSubs = compose(
        argSubs,
        moreArgSubs,
        tree,
        input
      );
      const allSubs = compose(
        allFunSubs,
        allArgsSubs,
        tree,
        input
      );
      const applied = apply(
        lhsType,
        allSubs,
        tree,
        input
      ) as ParametricType;

      const appliedSubs = compose(
        unify(
          apply(argType, allArgsSubs, lhs, input),
          applied.children[0]!,
          rhs,
          input
        ),
        allSubs,
        tree,
        input
      );
      const returnType = applied.children[1]!;
      return [returnType, appliedSubs, env2];
    }
    case "list": {
      if ((tree as Branch).children.length === 0)
        return [newList(neverType), [], env];

      const [type, subs] = (
        tree as Branch
      ).children.reduce(
        ([type, subs], child) => {
          let newType: Type;
          let newSubs: Substitutions;
          if (child.type === "destructuring") {
            [newType, newSubs] = infer(
              (child as Branch).children[0]!,
              env,
              input
            );
            const subsToGetToList = unify(
              newType,
              newList(type),
              child,
              input
            );
            newSubs = compose(
              newSubs,
              subsToGetToList,
              child,
              input
            );
            newType = apply(
              newType,
              newSubs,
              child,
              input
            );
            newType = (newType as ParametricType)
              .children[0]!;
          } else {
            [newType, newSubs] = infer(
              child,
              env,
              input
            );
          }
          const allSubs = compose(
            subs,
            newSubs,
            child,
            input
          );
          const appliedType = apply(
            newType,
            allSubs,
            child,
            input
          );
          return [
            apply(
              appliedType,
              unify(type, appliedType, child, input),
              child,
              input
            ),
            allSubs,
          ];
        },
        [newVar(), []] as [Type, Substitutions]
      );
      return [newList(type), subs, env];
    }
    case "record": {
      // TODO: Allow arbitrary key types
      if ((tree as Branch).children.length === 0)
        return [
          newRecord(neverType, neverType),
          [],
          env,
        ];

      const [type, subs] = (
        tree as Branch
      ).children.reduce(
        ([type, subs, env], field) => {
          const child = (field as Branch).children[0]!;
          const [newType, newSubs, newEnv] = infer(
            child.type === "destructuring"
              ? (child as Branch).children[0]!
              : child,
            env,
            input
          );
          // TODO: This is going to break just like it did for Lists
          const actualNewType =
            child.type === "destructuring"
              ? (newType as ParametricType)
                  .children[1]!
              : newType;
          return [
            apply(
              actualNewType,
              unify(type, actualNewType, child, input),
              child,
              input
            ),
            compose(subs, newSubs, child, input),
            { ...env, ...newEnv },
          ];
        },
        [newVar(), [], env] as [
          Type,
          Substitutions,
          TypeEnv
        ]
      );
      return [
        // TODO: Allow arbitrary key types
        newRecord(stringType, type),
        subs,
        env,
      ];
    }
    case "match": {
      const [lhsType] = infer(
        (tree as Branch).children[0]!,
        env,
        input
      );

      const rhsVar = newVar();
      const rhsSubs = (tree as Branch).children
        .slice(1)
        .reduce((subs, child) => {
          const [pattern, value] = (child as Branch)
            .children as [Tree, Tree];

          const [patterns, patternSubs] =
            extractPatterns(
              pattern,
              lhsType,
              input,
              env
            );
          const [valueType, valueSubs] = infer(
            value,
            { ...env, ...patterns },
            input
          );
          return compose(
            unify(rhsVar, valueType, child, input),
            compose(
              subs,
              compose(
                valueSubs,
                patternSubs,
                child,
                input
              ),
              child,
              input
            ),
            child,
            input
          );
        }, [] as Substitutions);

      const finalType = apply(
        rhsVar,
        rhsSubs,
        tree,
        input
      );

      return [finalType, rhsSubs, env];
    }
    case "typeclass": {
      const [name, param, ...methods] = (
        tree as Branch
      ).children as [Token, Token, ...Branch[]];
      const [patterns] = extractPatterns(
        param,
        newVar(),
        input
      );
      const klass = newClass(
        name.text,
        Object.values(patterns)[0] as TypeVar,
        methods.reduce(
          (acc, { children: [name, type] }) => ({
            ...acc,
            [((name as Branch).children[0] as Token)
              .text]: infer(type!, patterns, input)[0],
          }),
          {}
        )
      );
      return [
        klass,
        [],
        { ...env, [name.text]: klass },
      ];
    }
    default: {
      throw makeError(input, [
        {
          reason: `Cannot infer nodes of type "${tree.type}".`,
          at: tree.offset,
          size: tree.size,
        },
      ]);
    }
  }
};

const apply = (
  target: Type,
  subs: Substitutions,
  tree: Tree,
  input: string
): Type => {
  if (!subs.length) return target;

  if (isAtomic(target)) {
    return target;
  } else if (isVar(target)) {
    for (let i = 0; i < subs.length; i++) {
      const [tvar, sub] = subs[i]!;
      if (tvar.var === target.var) {
        if (sub === neverType) continue;
        return apply(
          sub,
          subs.toSpliced(i, 1),
          tree,
          input
        );
      }
    }
    return target;
  } else if (isParametric(target)) {
    return {
      ...target,
      children: target.children.map(type =>
        apply(type, subs, tree, input)
      ),
    };
  }

  throw makeError(input, [
    {
      reason: `Cannot apply to "${
        (target as any).type ?? target
      }".`,
      at: tree.offset,
      size: tree.size,
    },
  ]);
};

const applyEnv = (
  env: TypeEnv,
  subs: Substitutions,
  tree: Tree,
  input: string
) =>
  Object.fromEntries(
    Object.entries(env).map(([k, t]) => [
      k,
      apply(t, subs, tree, input),
    ])
  );

const compose = (
  a: Substitutions,
  b: Substitutions,
  tree: Tree,
  input: string
): Substitutions =>
  union(a)(b).reduce((subs, [tvarA, subA]) => {
    const subB = subs.find(
      ([tvarB]) => tvarB.var === tvarA.var
    )?.[1];
    return subs.concat(
      subB
        ? unify(subA, subB, tree, input)
        : [[tvarA, subA]]
    );
  }, [] as Substitutions);

const unify = (
  a: Type,
  b: Type,
  tree: Tree,
  input: string
): Substitutions => {
  if (
    (isAtomic(a) && isAtomic(b) && a === b) ||
    a === anyType ||
    b === anyType
  ) {
    return [];
  } else if (isVar(a) || isVar(b)) {
    if (occurs(a, b)) {
      throw makeError(input, [
        {
          reason: `Recursive types "${stringify(a, {
            colour: true,
            normalise: true,
          })}" and "${stringify(b, {
            colour: true,
            normalise: true,
          })}".`,
          at: tree.offset,
          size: tree.size,
        },
      ]);
    }
    return [isVar(a) ? [a, b] : [b as TypeVar, a]];
  } else if (
    isParametric(a) &&
    isParametric(b) &&
    a.constructor === b.constructor &&
    a.children.length === b.children.length
  ) {
    return a.children.flatMap((a, i) =>
      unify(a, b.children[i]!, tree, input)
    );
  }

  throw makeError(input, [
    {
      reason: `Cannot unify ${stringify(a, {
        colour: true,
        normalise: true,
      })} and ${stringify(b, {
        colour: true,
        normalise: true,
      })}`,
      at: tree.offset,
      size: tree.size,
    },
  ]);
};

const occurs = (
  a: Type,
  b: Type,
  root = true
): boolean => {
  if (isParametric(a)) {
    return a.children.some(child =>
      occurs(child, b, false)
    );
  } else if (isParametric(b)) {
    return b.children.some(child =>
      occurs(child, a, false)
    );
  }
  return root ? false : equal(a, b);
};

const extractPatterns = (
  pattern: Tree,
  type: Type,
  input: string,
  env?: TypeEnv
): readonly [TypeEnv, Substitutions] => {
  switch (pattern.type) {
    case "boolean": {
      return [
        {},
        unify(type, booleanType, pattern, input),
      ];
    }
    case "wildcard": {
      return [{}, []];
    }
    case "literal-pattern": {
      return extractPatterns(
        (pattern as Branch).children[0]!,
        type,
        input,
        env
      );
    }
    case "operator":
    case "name": {
      const name = (pattern as Token).text;
      return [
        { [name]: type },
        env?.[name]
          ? [[type as TypeVar, env[name]!]]
          : [],
      ];
    }
    case "list-pattern": {
      const elementType = newVar();
      const listType = newList(elementType);
      const [patterns, subs] = (
        pattern as Branch
      ).children.reduce(
        ([env, subs], pattern) => {
          const [newEnv, newSubs] = extractPatterns(
            pattern.type === "rest-pattern"
              ? (pattern as Branch).children[0]!
              : pattern,
            pattern.type === "rest-pattern"
              ? listType
              : elementType,
            input,
            env
          );
          return [
            { ...env, ...newEnv },
            compose(subs, newSubs, pattern, input),
          ] as const;
        },
        [{} as TypeEnv, [] as Substitutions] as const
      );
      return [
        patterns,
        compose(
          subs,
          unify(type, listType, pattern, input),
          pattern,
          input
        ),
      ];
    }
    case "record-pattern": {
      const elementType = newVar();
      // TODO: Allow arbitrary key types
      const recordType = newRecord(
        stringType,
        elementType
      );
      const [patterns, subs] = (
        pattern as Branch
      ).children.reduce(
        ([record, subs], field) => {
          const pattern = (field as Branch)
            .children[0]!;
          const [newRecord, newSubs] = extractPatterns(
            pattern.type === "rest-pattern"
              ? (pattern as Branch).children[0]!
              : pattern,
            pattern.type === "rest-pattern"
              ? recordType
              : elementType,
            input,
            env
          );
          return [
            { ...record, ...newRecord },
            compose(subs, newSubs, pattern, input),
          ] as const;
        },
        [{} as TypeEnv, [] as Substitutions] as const
      );
      return [
        patterns,
        compose(
          subs,
          unify(type, recordType, pattern, input),
          pattern,
          input
        ),
      ];
    }
    case "type-lambda-pattern": {
      const arg = newVar();
      const ret = newVar();
      const [patterns1, subs1] = extractPatterns(
        (pattern as Branch).children[0]!,
        arg,
        input,
        env
      );
      const [patterns2, subs2] = extractPatterns(
        (pattern as Branch).children[1]!,
        ret,
        input,
        env
      );
      const patterns3 = { ...patterns1, ...patterns2 };
      const lambda = newLambda(arg, ret);
      const subs = compose(
        subs1,
        compose(
          subs2,
          unify(type, lambda, pattern, input),
          pattern,
          input
        ),
        pattern,
        input
      );
      return [patterns3, subs];
    }
    case "type-pattern-application": {
      const arg = newVar();
      const lambda = newLambda(arg, type);
      const [patterns1, subs1] = extractPatterns(
        (pattern as Branch).children[0]!,
        arg,
        input,
        env
      );
      const [patterns2, subs2] = extractPatterns(
        (pattern as Branch).children[1]!,
        type,
        input,
        env
      );
      const subs = compose(
        subs1,
        compose(
          subs2,
          unify(newVar(), lambda, pattern, input),
          pattern,
          input
        ),
        pattern,
        input
      );
      const patterns3 = { ...patterns1, ...patterns2 };
      return [patterns3, subs];
    }
    default:
      throw makeError(input, [
        {
          reason: `Cannot extract from patterns of type "${pattern.type}"`,
          at: pattern.offset,
          size: pattern.size,
        },
      ]);
  }
};
