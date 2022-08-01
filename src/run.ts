import compile from "./compiler/compiler.js";
import repl from "./repl/repl.js";

const target = process.argv[2];

if (target) {
  await compile(target);
} else {
  await repl();
}
