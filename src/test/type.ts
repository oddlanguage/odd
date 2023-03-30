// import parse from "../core/odd.js";
// import test from "../core/test.js";
// import check, {
//   newLambdaType,
//   newTypeclassConstraint,
//   stringify
// } from "../core/type.js";
// import { equal } from "../core/util.js";

// test("Generics", () => {
//   const input = "a -> a";
//   const [type] = check(parse(input), {}, input);
//   return equal(newLambdaType(0, 0), type);
// });

// test("Typeclasses", () => {
//   const input = "a b -> a + b";
//   const addable = Symbol("Addable");
//   const [type] = check(
//     parse(input),
//     {
//       "+": newLambdaType(
//         addable,
//         newLambdaType(addable, addable)
//       )
//     },
//     input
//   );
//   const expected = newTypeclassConstraint(
//     {
//       [stringify(0)]: addable
//     },
//     newLambdaType(0, newLambdaType(0, 0))
//   );
//   return equal(expected, type);
// });
