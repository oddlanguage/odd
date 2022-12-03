// import _eval from "../eval.js";
// import parse, { defaultEnv } from "../odd.js";
// import test from "../test.js";
// import { equal } from "../util.js";

// test("Match expression selects correct case", () => {
//   const code = `case (3) of 1 = nothing, 2 = nothing, 3 = true`;
//   const [result] = _eval(
//     parse(code),
//     defaultEnv,
//     code
//   );
//   return result === true;
// });

// test("Match expression correctly selects wildcard", () => {
//   const code = `case (2) of 1 = nothing, _ = true`;
//   const [result] = _eval(
//     parse(code),
//     defaultEnv,
//     code
//   );
//   return result === true;
// });

// test("Matches do not fall through", () => {
//   const code = `case (1) of 1 = true, _ = false`;
//   const [result] = _eval(
//     parse(code),
//     defaultEnv,
//     code
//   );
//   return result === true;
// });

// test("List pattern case", () => {
//   const code = `case ([1, 2]) of [a] = a, _ = false`;
//   const [result] = _eval(
//     parse(code),
//     defaultEnv,
//     code
//   );
//   return result === 1;
// });

// test("List rest pattern case", () => {
//   const code = `case ([1, 2]) of [...a] = a, _ = false`;
//   const [result] = _eval(
//     parse(code),
//     defaultEnv,
//     code
//   );
//   return equal(result, [1, 2]);
// });

// test("Record pattern case", () => {
//   const code = `case ({a=1,b=2}) of {a} = a, _ = false`;
//   const [result] = _eval(
//     parse(code),
//     defaultEnv,
//     code
//   );
//   return result === 1;
// });

// test("Record rest pattern case", () => {
//   const code = `case ({a=1,b=2}) of {...x} = x, _ = false`;
//   const [result] = _eval(
//     parse(code),
//     defaultEnv,
//     code
//   );
//   return equal(result, { a: 1, b: 2 });
// });
