import { operatorRegex } from "./odd.js";
import { Branch, Token, Tree } from "./parse.js";
import { makeError } from "./problem.js";
import { Mutable, equal, union } from "./util.js";

type Type =
  | AtomicType
  | TypeVar
  | ParametricType
  | TypeConstraint
  | TypeClass;

type AtomicType = Readonly<{
  type: "atomic";
  name: symbol;
  instances?:
    | ReadonlyArray<TypeClass["name"]>
    | undefined;
}>;

type TypeVar = Readonly<{ type: "var"; var: number }>;

type ParametricType = Readonly<{
  type: "parametric";
  atom: AtomicType;
  infix?: string;
  children: ReadonlyArray<Type>;
}>;

type TypeConstraint = Readonly<{
  type: "constraint";
  constraints: ReadonlyArray<
    readonly [TypeVar, TypeClass]
  >;
  child: Type;
}>;

type TypeClass = Readonly<{
  type: "class";
  name: symbol;
  params: ReadonlyArray<TypeVar>;
  members: TypeEnv;
}>;

type TypeEnv = Readonly<Record<string, Type>>;
type TypeClasses = Readonly<Record<string, TypeClass>>;

const newAtomic = (
  name: AtomicType["name"],
  instances?: AtomicType["instances"]
): AtomicType => ({
  type: "atomic",
  name,
  instances,
});
export const neverType = newAtomic(Symbol("Never"));
export const lambdaType = newAtomic(Symbol("Lambda"));
export const recordType = newAtomic(Symbol("Record"));
export const listType = newAtomic(Symbol("List"));

const newLambda = (
  input: Type,
  output: Type
): ParametricType => ({
  type: "parametric",
  atom: lambdaType,
  infix: "->",
  children: [input, output],
});

const newList = (type: Type): ParametricType => ({
  type: "parametric",
  atom: listType,
  children: [type],
});

const newRecord = (
  key: Type,
  type: Type
): ParametricType => ({
  type: "parametric",
  atom: recordType,
  children: [key, type],
});

const newConstraint = (
  constraints: TypeConstraint["constraints"],
  child: TypeConstraint["child"]
): TypeConstraint => ({
  type: "constraint",
  constraints,
  child,
});

const newClass = (
  name: TypeClass["name"],
  params: TypeClass["params"],
  members: TypeClass["members"]
): TypeClass => ({
  type: "class",
  name,
  params,
  members,
});

// TODO: Type schemes

let __LAST_TYPE_VAR = 0;
const newVar = (): TypeVar => ({
  type: "var",
  var: __LAST_TYPE_VAR++,
});

export const booleanType = newAtomic(
  Symbol("Boolean")
);
const Eq = (() => {
  const a = newVar();
  return newClass(Symbol("Eq"), [a], {
    "==": newLambda(a, newLambda(a, booleanType)),
    "!=": newLambda(a, newLambda(a, booleanType)),
  });
})();

// This is ugly but necessary :)
((booleanType.instances as Mutable<
  AtomicType["instances"]
>) ??= []).push(Eq.name);

export const numberType = newAtomic(Symbol("Number"), [
  Eq.name,
]);
export const nothingType = newAtomic(
  Symbol("Nothing"),
  [Eq.name]
);
export const stringType = newAtomic(Symbol("String"), [
  Eq.name,
]);

const isAtomic = (type: Type): type is AtomicType =>
  (type as AtomicType).type === "atomic";

const isConstraint = (
  type: Type
): type is TypeConstraint =>
  (type as TypeConstraint).type === "constraint";

const isClass = (type: Type): type is TypeClass =>
  (type as TypeClass).type === "class";

const isParametric = (
  type: Type
): type is ParametricType =>
  (type as ParametricType).type === "parametric";

const isVar = (type: Type): type is TypeVar =>
  (type as TypeVar).type === "var";

const alphabet = "αβγδεζηθικλμνξοπρστυφχψω";
const subscript = "₀₁₂₃₄₅₆₇₈₉";
export const stringify = (type: Type): string => {
  if (isAtomic(type)) {
    return type.name.description!;
  } else if (isVar(type)) {
    return (
      alphabet[type.var] ??
      alphabet[type.var % alphabet.length] +
        [
          ...Math.floor(
            type.var / alphabet.length
          ).toString(),
        ]
          .map(x => subscript[Number(x)])
          .join("")
    );
  } else if (isParametric(type)) {
    if (type.infix)
      return type.children
        .map((child, i) =>
          i === 0 &&
          isParametric(child) &&
          child.atom === type.atom
            ? `(${stringify(child)})`
            : stringify(child)
        )
        .join(` ${type.infix} `);
    return (
      type.atom.name.description! +
      " " +
      type.children.map(stringify).join(" ")
    );
  } else if (isConstraint(type)) {
    return `(${type.constraints
      .map(
        ([tvar, tclass]) =>
          `${tclass.name.description} ${stringify(
            tvar
          )}`
      )
      .join(", ")}) => ${stringify(type.child)}`;
  } else if (isClass(type)) {
    return `class ${
      type.name.description
    } ${type.params
      .map(stringify)
      .join(", ")} where ${Object.entries(type.members)
      .map(
        ([key, type]) =>
          `${
            new RegExp(
              `^${operatorRegex.source}$`,
              operatorRegex.flags
            ).test(key)
              ? `(${key})`
              : key
          } : ${stringify(type)}`
      )
      .join(", ")}`;
  }

  throw `Cannot stringify "${
    (type as any).type ?? type
  }"`;
};

export const defaultTypeEnv: TypeEnv = (() => {
  const a = newVar();
  const b = newVar();
  const c = newVar();

  return {
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
    "++": newLambda(
      newList(a),
      newLambda(newList(a), newList(a))
    ),
    range: newLambda(numberType, newList(numberType)),
    "range-from": newLambda(
      numberType,
      newLambda(numberType, newList(numberType))
    ),
    // map: newLambda(
    //   newLambda(a, b),
    //   newLambda(newList(a), newList(b))
    // ),
    filter: newLambda(
      newLambda(a, booleanType),
      newLambda(newList(a), newList(a))
    ),
    fold: newLambda(
      newLambda(b, newLambda(a, b)),
      newLambda(b, newLambda(newList(a), b))
    ),
    scan: newLambda(
      newLambda(b, newLambda(a, b)),
      newLambda(b, newLambda(newList(a), newList(b)))
    ),
    reverse: newLambda(newList(a), newList(a)),
    tail: newLambda(newList(a), newList(a)),
    drop: newLambda(
      numberType,
      newLambda(newList(a), newList(a))
    ),
    "|>": newLambda(a, newLambda(newLambda(a, b), b)),
    "<|": newLambda(newLambda(a, b), newLambda(a, b)),
    "<.": newLambda(
      newLambda(b, c),
      newLambda(newLambda(a, b), newLambda(a, c))
    ),
    ".>": newLambda(
      newLambda(a, b),
      newLambda(newLambda(b, c), newLambda(a, c))
    ),
    prepend: newLambda(
      a,
      newLambda(newList(a), newList(a))
    ),
    append: newLambda(
      a,
      newLambda(newList(a), newList(a))
    ),
    panic: newLambda(stringType, neverType),
    benchmark: newLambda(newLambda(a, b), numberType),
    // TODO: Implement these types as well
    // "<": Ord a => a -> a -> Boolean,
    // ">": Ord a => a -> a -> Boolean,
    // "<=": Ord a => a -> a -> Boolean,
    // ">=": Ord a => a -> a -> Boolean,
    // "@": (k: string) => (x: any) => x[k],
    // has: (k: string) => (x: any) => k in x,
    // group:
    //   (f: (x: any) => string) =>
    //   (x: Record<any, any>[]) => {
    //     const groups: Record<string, any> = {};
    //     for (const obj of x) {
    //       const key = f(obj);
    //       if (!groups[key]) groups[key] = [];
    //       groups[key].push(obj);
    //     }
    //     return groups;
    //   },
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
    head: newLambda(newList(a), a),
    // last: (xs: any[]) => xs[xs.length - 1] ?? nothing,
    // sort:
    //   (f: (b: any) => (a: any) => number) =>
    //   (xs: any[]) =>
    //     xs.slice().sort((a, b) => f(a)(b)),
    // "sort-by": (key: string | Function) => (xs: any[]) =>
    //   xs
    //     .slice()
    //     .sort((a, b) =>
    //       typeof key === "function"
    //         ? key(a) > key(b)
    //           ? -1
    //           : key(b) > key(a)
    //           ? 1
    //           : 0
    //         : a[key] > b[key]
    //         ? 1
    //         : b[key] > a[key]
    //         ? -1
    //         : 0
    //     ),
    // partition:
    //   (f: (x: any) => boolean) => (xs: any[]) => {
    //     const parts: [any[], any[]] = [[], []];
    //     for (const x of xs) parts[f(x) ? 1 : 0].push(x);
    //     return parts;
    //   },
    // size: (x: any) =>
    //   (typeof x === "string"
    //     ? Array.from(new Intl.Segmenter().segment(x))
    //     : Object.keys(x)
    //   ).length,
    // max: (a: any) => (b: any) => Math.max(a, b),
    // min: (a: any) => (b: any) => Math.min(a, b),
    // show: (x: any) => {
    //   // TODO: Serialise as odd values instead of js values
    //   console.log(serialise(x));
    //   return x;
    // },
    // import: (name: string) => {
    //   try {
    //     const input = readFileSync(
    //       path.parse(name).ext ? name : name + ".odd",
    //       "utf8"
    //     );
    //     return _eval(parse(input), defaultEnv, input)[1];
    //   } catch (err: any) {
    //     // TODO: use `makeError`
    //     throw err.code === "ENOENT"
    //       ? `Cannot resolve module "${name}".`
    //       : err.toString();
    //   }
    // },
  };
})();

export const defaultTypeClasses: TypeClasses = {
  Eq,
};

type Substitutions = ReadonlyArray<Substitution>;

type Substitution = readonly [TypeVar, Type];

export const infer = (
  tree: Tree,
  env: TypeEnv,
  classes: TypeClasses,
  input: string
): readonly [
  Type,
  Substitutions,
  TypeEnv,
  TypeClasses
] => {
  switch (tree.type) {
    case "program":
      return (tree as Branch).children.reduce(
        ([, , env, classes], branch) =>
          infer(branch, env, classes, input),
        [nothingType, [], env, classes] as ReturnType<
          typeof infer
        >
      );
    case "statement": {
      return infer(
        (tree as Branch).children[0]!,
        env,
        classes,
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
        classes,
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

      return [valueType, subs, appliedEnv, classes];
    }
    case "number":
      return [numberType, [], env, classes];
    case "string":
      return [stringType, [], env, classes];
    case "type-lambda":
    case "lambda": {
      const [param, body] = (tree as Branch)
        .children as [Tree, Tree];
      const paramVar = newVar();
      const [patterns, paramSubs] = extractPatterns(
        param,
        paramVar,
        input
      );
      const bodyVar = newVar();
      const [bodyType, bodySubs] = infer(
        body,
        {
          ...env,
          ...patterns,
        },
        classes,
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

      return [finalType, allSubs, env, classes];
    }
    case "name":
    case "operator": {
      const { text } = tree as Token;

      for (const typeclass of Object.values(classes)) {
        if (text in typeclass.members) {
          return [
            newConstraint(
              typeclass.params.map(param => [
                param,
                typeclass,
              ]),
              typeclass.members[text]!
            ),
            [],
            env,
            classes,
          ];
        }
      }

      if (!(text in env)) {
        throw makeError(input, [
          {
            reason: `Unknown name "${text}".`,
            at: tree.offset,
            size: tree.size,
          },
        ]);
      }
      return [env[text]!, [], env, classes];
    }
    case "infix": {
      const [lhs, op, rhs] = (tree as Branch)
        .children as [Tree, Tree, Tree];

      const [lhsType, lhsSubs, env1, classes1] = infer(
        lhs,
        env,
        classes,
        input
      );
      const [opType, opSubs, env2, classes2] = infer(
        op,
        env1,
        classes1,
        input
      );
      const [rhsType, rhsSubs, env3, classes3] = infer(
        rhs,
        env2,
        classes2,
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

      return [returnType, subs, env3, classes3];
    }
    case "application": {
      const [lhs, rhs] = (tree as Branch).children as [
        Tree,
        Tree
      ];

      const [lhsType, lhsSubs, env1, classes1] = infer(
        lhs,
        env,
        classes,
        input
      );

      // TODO: Implement this through typeclasses
      // e.g. (Indexable a, Index b) => b -> a -> a[b]
      if (
        isParametric(lhsType) &&
        (lhsType.atom.name === recordType.name ||
          lhsType.atom.name === listType.name)
      ) {
        throw "Not implemented.";
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
      const [argType, argSubs, env2, classes2] = infer(
        rhs,
        env1,
        classes1,
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
      ) as ParametricType | TypeConstraint;
      const returnType = isParametric(applied)
        ? applied.children[1]!
        : applied.constraints.some(([constraint]) =>
            occurs(
              constraint,
              (applied.child as ParametricType)
                .children[1]!
            )
          )
        ? // TODO Ensure only constraints that are used get
          // mapped into the new constrained type
          newConstraint(
            applied.constraints,
            (applied.child as ParametricType)
              .children[1]!
          )
        : (applied.child as ParametricType)
            .children[1]!;

      return [returnType, allSubs, env2, classes2];
    }
    case "list": {
      if ((tree as Branch).children.length === 0)
        return [newList(neverType), [], env, classes];

      const [type, subs, newEnv, classes1] = (
        tree as Branch
      ).children.reduce(
        ([type, subs, env, classes], child) => {
          const [newType, newSubs, newEnv, classes1] =
            infer(
              child.type === "destructuring"
                ? (child as Branch).children[0]!
                : child,
              env,
              classes,
              input
            );
          const actualNewType =
            child.type === "destructuring"
              ? (newType as ParametricType)
                  .children[0]!
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
            classes1,
          ] as const;
        },
        [
          newVar() as Type,
          [] as Substitutions,
          env,
          classes,
        ] as const
      );
      return [newList(type), subs, newEnv, classes1];
    }
    case "record": {
      if ((tree as Branch).children.length === 0)
        return [
          // TODO: Allow arbitrary key types
          newRecord(stringType, neverType),
          [],
          env,
          classes,
        ];

      const [type, subs] = (
        tree as Branch
      ).children.reduce(
        ([type, subs, env, classes], field) => {
          const child = (field as Branch).children[0]!;
          const [newType, newSubs, newEnv, classes1] =
            infer(
              child.type === "destructuring"
                ? (child as Branch).children[0]!
                : child,
              env,
              classes,
              input
            );
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
            classes1,
          ] as const;
        },
        [
          newVar() as Type,
          [] as Substitutions,
          env,
          classes,
        ] as const
      );
      return [
        // TODO: Allow arbitrary key types
        newRecord(stringType, type),
        subs,
        env,
        classes,
      ];
    }
    case "typeclass": {
      const [{ text: name }, param, ...memberNodes] = (
        tree as Branch
      ).children as [Token, Token, ...Branch[]];
      const paramType = newVar();
      const [patterns, patternSubs] = extractPatterns(
        param,
        paramType,
        input
      );
      const members = Object.fromEntries(
        memberNodes.map(
          member =>
            [
              (
                (member.children[0] as Branch)
                  .children[0] as Token
              ).text,
              infer(
                member,
                {
                  Nothing: nothingType,
                  Boolean: booleanType,
                  Number: numberType,
                  String: stringType,
                  ...env,
                  ...patterns,
                },
                classes,
                input
              )[0],
            ] as const
        )
      );
      const _class = newClass(
        Symbol(name),
        Object.values(
          patterns
        ) as ReadonlyArray<TypeVar>,
        members
      );
      return [
        _class,
        patternSubs,
        { ...env },
        { ...classes, [name]: _class },
      ];
    }
    case "type-application": {
      const arg = newVar();
      const ret = newVar();
      const lambda = newLambda(arg, ret);
      const [lhs, subs1, env1, classes1] = infer(
        (tree as Branch).children[0]!,
        env,
        classes,
        input
      );
      const [rhs, subs2, env2, classes2] = infer(
        (tree as Branch).children[1]!,
        env1,
        classes1,
        input
      );
      const subs3 = unify(
        lhs,
        arg,
        (tree as Branch).children[0]!,
        input
      );
      const subs4 = unify(
        rhs,
        arg,
        (tree as Branch).children[1]!,
        input
      );
      const allSubs = compose(
        subs1,
        compose(
          subs2,
          compose(subs3, subs4, tree, input),
          tree,
          input
        ),
        tree,
        input
      );
      const newEnv = applyEnv(
        env2,
        allSubs,
        tree,
        input
      );
      return [lambda, allSubs, newEnv, classes2];
    }
    case "match": {
      const [type] = infer(
        (tree as Branch).children[0]!,
        env,
        classes,
        input
      );
      const cases = (tree as Branch).children
        .slice(1)
        .map(child => {
          const [pattern, expr] = (child as Branch)
            .children as [Branch, Branch];
          const [env2, subs2] = extractPatterns(
            pattern,
            type,
            input
          );
          const [caseType] = infer(
            expr,
            applyEnv(
              { ...env, ...env2 },
              subs2,
              child,
              input
            ),
            classes,
            input
          );
          return caseType;
        });
      const [returnType, allSubs] = cases.reduce(
        ([type, subs], _case) => {
          const newSubs = compose(
            subs,
            unify(type, _case, tree, input),
            tree,
            input
          );
          return [
            apply(type, newSubs, tree, input),
            newSubs,
          ] as const;
        },
        [newVar(), []] as readonly [
          Type,
          Substitutions
        ]
      );
      return [returnType, allSubs, env, classes];
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
    for (const [tvar, sub] of subs) {
      if (tvar.var === target.var) return sub;
    }
    return target;
  } else if (isParametric(target)) {
    return {
      ...target,
      children: target.children.map(type =>
        apply(type, subs, tree, input)
      ),
    };
  } else if (isConstraint(target)) {
    const hoisted = hoistConstraints(
      apply(target.child, subs, tree, input),
      tree,
      input
    );
    const constraints = target.constraints.concat(
      isConstraint(hoisted) ? hoisted.constraints : []
    );
    return isConstraint(hoisted)
      ? { ...hoisted, constraints }
      : { ...target, child: hoisted };
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

const hoistConstraints = (
  type: Type,
  tree: Tree,
  input: string
): Type => {
  if (isAtomic(type)) {
    return type;
  } else if (isVar(type)) {
    return type;
  } else if (isParametric(type)) {
    const constraints = type.children
      .map(child =>
        hoistConstraints(child, tree, input)
      )
      .map(type =>
        isConstraint(type)
          ? ([type.constraints, type.child] as const)
          : ([[], type] as const)
      );
    // TODO: Extract to some function `mergeConstraints`
    const uniqueConstraints = Object.entries(
      constraints
        .flatMap(c => c[0])
        .reduce(
          (constraints, [tvar, tclass]) => ({
            ...constraints,
            [tvar.var]: tclass,
          }),
          {} as Record<number, TypeClass>
        )
    ).map(
      ([tvar, tclass]) =>
        [
          { type: "var", var: Number(tvar) },
          tclass,
        ] as const
    );
    const children = constraints.flatMap(c => c[1]);
    return newConstraint(uniqueConstraints, {
      ...type,
      children,
    });
  } else if (isConstraint(type)) {
    const hoisted = hoistConstraints(
      type.child,
      tree,
      input
    );
    return isConstraint(hoisted)
      ? newConstraint(
          // TODO: Extract to some function `mergeConstraints`
          Object.entries(
            type.constraints
              .concat(hoisted.constraints)
              .reduce(
                (constraints, [tvar, tclass]) => ({
                  ...constraints,
                  [tvar.var]: tclass,
                }),
                {} as Record<number, TypeClass>
              )
          ).map(
            ([tvar, tclass]) =>
              [
                { type: "var", var: Number(tvar) },
                tclass,
              ] as const
          ),
          hoisted.child
        )
      : { ...type, child: hoisted };
  }
  throw makeError(input, [
    {
      reason: `Cannot hoist constraints in "${
        (type as any).type ?? type
      }"`,
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
): Substitutions => {
  const result = union(a)(
    b.map(([tvar, tsub]) => [
      tvar,
      apply(tsub, a, tree, input),
    ])
  ).reduce((subs, [tvarA, subA]) => {
    const subB = subs.find(
      ([tvarB]) => tvarB.var === tvarA.var
    )?.[1];
    return subs.concat(
      subB
        ? unify(subA, subB, tree, input)
        : [[tvarA, subA]]
    );
  }, [] as Substitutions);
  return result;
};

const unify = (
  a: Type,
  b: Type,
  tree: Tree,
  input: string
): Substitutions => {
  if (
    isAtomic(a) &&
    isAtomic(b) &&
    a.name === b.name
  ) {
    return [];
  } else if (isVar(a) || isVar(b)) {
    if (occurs(a, b)) {
      throw makeError(input, [
        {
          reason: `Recursive types "${stringify(
            a
          )}" and "${stringify(b)}".`,
          at: tree.offset,
          size: tree.size,
        },
      ]);
    }
    return [isVar(a) ? [a, b] : [b as TypeVar, a]];
  } else if (
    isParametric(a) &&
    isParametric(b) &&
    a.atom.name === b.atom.name &&
    a.children.length === b.children.length
  ) {
    return a.children.flatMap((a, i) =>
      unify(a, b.children[i]!, tree, input)
    );
  } else if (isConstraint(a) || isConstraint(b)) {
    // TODO: Ugly, merge
    if (
      isConstraint(a) &&
      isAtomic(b) &&
      isVar(a.child) &&
      a.constraints[0]![0].var === a.child.var
    ) {
      const className = a.constraints[0]![1].name;
      const instance =
        b.instances?.includes(className);
      if (!instance)
        throw makeError(input, [
          {
            reason: `No instance of ${
              className.description
            } found for ${stringify(b)}`,
            at: tree.offset,
            size: tree.size,
          },
        ]);
      return [];
    }
    if (
      isConstraint(b) &&
      isAtomic(a) &&
      isVar(b.child) &&
      b.constraints[0]![0].var === b.child.var
    ) {
      const className = b.constraints[0]![1].name;
      const instance =
        a.instances?.includes(className);
      if (!instance)
        throw makeError(input, [
          {
            reason: `No instance of ${
              className.description
            } found for ${stringify(a)}`,
            at: tree.offset,
            size: tree.size,
          },
        ]);
      return [];
    }

    const typeA = isConstraint(a) ? a.child : a;
    const typeB = isConstraint(b) ? b.child : b;
    // TODO: Extract to some function `mergeConstraints`
    const constraints = Object.entries(
      (isConstraint(a) ? a.constraints : [])
        .concat(isConstraint(b) ? b.constraints : [])
        .reduce(
          (constraints, [tvar, tclass]) => ({
            ...constraints,
            [tvar.var]: tclass,
          }),
          {} as Record<number, TypeClass>
        )
    ).map(
      ([tvar, tclass]) =>
        [
          { type: "var", var: Number(tvar) },
          tclass,
        ] as const
    );
    const subs = unify(typeA, typeB, tree, input);
    const constrainedSubs = subs.map(
      ([tvar, sub]) =>
        [
          tvar,
          constraints.some(([tvar]) =>
            occurs(tvar, sub)
          )
            ? newConstraint(constraints, sub)
            : sub,
        ] as const
    );
    return constrainedSubs;
  }
  throw makeError(input, [
    {
      reason: `Cannot unify "${stringify(
        a
      )}" and "${stringify(b)}"`,
      at: tree.offset,
      size: tree.size,
    },
  ]);
};

const occurs = (a: Type, b: Type): boolean => {
  if (isParametric(a)) {
    return a.children.some(child => occurs(child, b));
  } else if (isParametric(b)) {
    return b.children.some(child => occurs(child, a));
  }
  return equal(a, b);
};

const extractPatterns = (
  pattern: Tree,
  type: Type,
  input: string
): readonly [TypeEnv, Substitutions] => {
  switch (pattern.type) {
    case "literal-pattern": {
      return extractPatterns(
        (pattern as Branch).children[0]!,
        type,
        input
      );
    }
    case "operator":
    case "name":
      return [{ [(pattern as Token).text]: type }, []];
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
            input
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
        ([env, subs], field) => {
          const pattern = (field as Branch)
            .children[0]!;
          const [newEnv, newSubs] = extractPatterns(
            pattern.type === "rest-pattern"
              ? (pattern as Branch).children[0]!
              : pattern,
            pattern.type === "rest-pattern"
              ? recordType
              : elementType,
            input
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
          unify(type, recordType, pattern, input),
          pattern,
          input
        ),
      ];
    }
    case "type-lambda-pattern": {
      const arg = newVar();
      const ret = newVar();
      const [env1, subs1] = extractPatterns(
        (pattern as Branch).children[0]!,
        arg,
        input
      );
      const [env2, subs2] = extractPatterns(
        (pattern as Branch).children[1]!,
        ret,
        input
      );
      const env = { ...env1, ...env2 };
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
      return [env, subs];
    }
    case "type-pattern-application": {
      const arg = newVar();
      const lambda = newLambda(arg, type);
      const [env1, subs1] = extractPatterns(
        (pattern as Branch).children[0]!,
        arg,
        input
      );
      const [env2, subs2] = extractPatterns(
        (pattern as Branch).children[1]!,
        type,
        input
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
      const env = { ...env1, ...env2 };
      return [env, subs];
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
